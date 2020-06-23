/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has, chunk, omit } from 'lodash/fp';
import { Readable } from 'stream';

import { TimelineType, TimelineStatus, SavedTimeline } from '../../../../../common/types/timeline';
import { validate } from '../../../../../common/validate';
import { NoteResult } from '../../../../graphql/types';
import { HapiReadableStream } from '../../../detection_engine/rules/types';
import { createBulkErrorObject, BulkError } from '../../../detection_engine/routes/utils';
import { checkIsFailureCases } from './update_timelines';
import { createTimelines, getTimeline, getTemplateTimeline } from './create_timelines';
import { FrameworkRequest } from '../../../framework';
import { PromiseFromStreams } from '../import_timelines_route';
import { createTimelinesStreamFromNdJson } from '../../create_timelines_stream_from_ndjson';
import { createPromiseFromStreams } from '../../../../../../../../src/legacy/utils';
import {
  ImportTimelineResultSchema,
  importTimelineResultSchema,
} from '../schemas/import_timelines_schema';
import { getTupleDuplicateErrorsAndUniqueTimeline } from './get_timelines_from_stream';

export type ImportedTimeline = SavedTimeline & {
  savedObjectId: string | null;
  version: string | null;
  pinnedEventIds: string[];
  globalNotes: NoteResult[];
  eventNotes: NoteResult[];
};

interface ImportRegular {
  timeline_id: string;
  status_code: number;
  message?: string;
  action: 'createViaImport' | 'updateViaImport';
}

export type ImportTimelineResponse = ImportRegular | BulkError;
export interface ImportTimelinesRequestParams {
  body: { file: HapiReadableStream };
}

export const isImportRegular = (
  importTimelineResponse: ImportTimelineResponse
): importTimelineResponse is ImportRegular => {
  return !has('error', importTimelineResponse) && has('status_code', importTimelineResponse);
};

export const isBulkError = (
  importRuleResponse: ImportTimelineResponse
): importRuleResponse is BulkError => {
  return has('error', importRuleResponse);
};

/**
 * This fields do not exists in savedObject mapping, but exist in Users' import,
 * exclude them here to avoid creating savedObject failure
 */
export const timelineSavedObjectOmittedFields = [
  'globalNotes',
  'eventNotes',
  'pinnedEventIds',
  'savedObjectId',
  'created',
  'createdBy',
  'updated',
  'updatedBy',
  'version',
];

const CHUNK_PARSED_OBJECT_SIZE = 10;

export const importTimelines = async (
  file: Readable,
  maxTimelineImportExportSize: number,
  frameworkRequest: FrameworkRequest,
  isImmutable?: boolean
): Promise<ImportTimelineResultSchema | string> => {
  const readStream = createTimelinesStreamFromNdJson(maxTimelineImportExportSize);
  const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([file, ...readStream]);

  const [duplicateIdErrors, uniqueParsedObjects] = getTupleDuplicateErrorsAndUniqueTimeline(
    parsedObjects,
    false
  );

  const chunkParseObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, uniqueParsedObjects);
  let importTimelineResponse: ImportTimelineResponse[] = [];

  while (chunkParseObjects.length) {
    const batchParseObjects = chunkParseObjects.shift() ?? [];
    const newImportTimelineResponse = await Promise.all(
      batchParseObjects.reduce<Array<Promise<ImportTimelineResponse>>>((accum, parsedTimeline) => {
        const importsWorkerPromise = new Promise<ImportTimelineResponse>(
          async (resolve, reject) => {
            if (parsedTimeline instanceof Error) {
              // If the JSON object had a validation or parse error then we return
              // early with the error and an (unknown) for the ruleId
              resolve(
                createBulkErrorObject({
                  statusCode: 400,
                  message: parsedTimeline.message,
                })
              );

              return null;
            }
            const {
              savedObjectId = null,
              pinnedEventIds,
              globalNotes,
              eventNotes,
              templateTimelineId,
              templateTimelineVersion,
              timelineType,
              version = null,
            } = parsedTimeline;
            const parsedTimelineObject = omit(timelineSavedObjectOmittedFields, parsedTimeline);

            let newTimeline = null;
            try {
              const templateTimeline =
                templateTimelineId != null
                  ? await getTemplateTimeline(frameworkRequest, templateTimelineId)
                  : null;

              const timeline =
                savedObjectId != null && (await getTimeline(frameworkRequest, savedObjectId));
              const isHandlingTemplateTimeline = timelineType === TimelineType.template;

              if (
                (timeline == null && !isHandlingTemplateTimeline) ||
                (timeline == null && templateTimeline == null && isHandlingTemplateTimeline)
              ) {
                // create timeline / template timeline
                newTimeline = await createTimelines(
                  frameworkRequest,
                  {
                    ...parsedTimelineObject,
                    status:
                      parsedTimelineObject.status === TimelineStatus.draft
                        ? TimelineStatus.active
                        : parsedTimelineObject.status,
                  },
                  null, // timelineSavedObjectId
                  null, // timelineVersion
                  pinnedEventIds,
                  isHandlingTemplateTimeline ? globalNotes : [...globalNotes, ...eventNotes],
                  [], // existing note ids
                  isImmutable
                );

                resolve({
                  timeline_id: newTimeline.timeline.savedObjectId,
                  status_code: 200,
                  action: 'updateViaImport',
                });
              } else if (
                timeline &&
                timeline != null &&
                templateTimeline != null &&
                isHandlingTemplateTimeline
              ) {
                // update template timeline
                const errorObj = checkIsFailureCases(
                  isHandlingTemplateTimeline,
                  version,
                  templateTimelineVersion ?? null,
                  timeline,
                  templateTimeline
                );
                if (errorObj != null) {
                  // const siemResponse = buildSiemResponse(response);
                  // return siemResponse.error(errorObj);
                  return errorObj;
                }

                newTimeline = await createTimelines(
                  frameworkRequest,
                  { ...parsedTimelineObject, templateTimelineId, templateTimelineVersion },
                  timeline.savedObjectId, // timelineSavedObjectId
                  timeline.version, // timelineVersion
                  pinnedEventIds,
                  globalNotes,
                  [], // existing note ids
                  isImmutable
                );

                resolve({
                  timeline_id: newTimeline.timeline.savedObjectId,
                  status_code: 200,
                  action: 'updateViaImport',
                });
              } else {
                resolve(
                  createBulkErrorObject({
                    id: savedObjectId ?? 'unknown',
                    statusCode: 409,
                    message: `timeline_id: "${savedObjectId}" already exists`,
                  })
                );
              }
            } catch (err) {
              resolve(
                createBulkErrorObject({
                  id: savedObjectId ?? 'unknown',
                  statusCode: 400,
                  message: err.message,
                })
              );
            }
          }
        );
        return [...accum, importsWorkerPromise];
      }, [])
    );
    importTimelineResponse = [
      ...duplicateIdErrors,
      ...importTimelineResponse,
      ...newImportTimelineResponse,
    ];
  }

  const errorsResp = importTimelineResponse.filter((resp) => isBulkError(resp)) as BulkError[];
  const successes = importTimelineResponse.filter((resp) => {
    if (isImportRegular(resp)) {
      return resp.status_code === 200;
    } else {
      return false;
    }
  });
  const timelinesInstalled = importTimelineResponse.filter(
    (resp) => isImportRegular(resp) && resp.action === 'createViaImport'
  );
  const timelinesUpdated = importTimelineResponse.filter(
    (resp) => isImportRegular(resp) && resp.action === 'updateViaImport'
  );
  const importTimelinesRes: ImportTimelineResultSchema = {
    success: errorsResp.length === 0,
    success_count: successes.length,
    errors: errorsResp,
    timelines_installed: timelinesInstalled.length,
    timelines_updated: timelinesUpdated.length,
  };
  const [validated, errors] = validate(importTimelinesRes, importTimelineResultSchema);
  if (errors != null || validated == null) {
    return errors || 'Import timeline error';
  } else {
    return validated;
  }
};
