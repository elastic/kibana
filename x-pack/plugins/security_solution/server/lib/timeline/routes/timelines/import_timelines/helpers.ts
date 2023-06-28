/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has, chunk, omit } from 'lodash/fp';
import type { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { createPromiseFromStreams } from '@kbn/utils';

import { validate } from '@kbn/securitysolution-io-ts-utils';
import type { ImportTimelineResultSchema } from '../../../../../../common/api/timeline';
import { importTimelineResultSchema, TimelineStatus } from '../../../../../../common/api/timeline';

import type { BulkError } from '../../../../detection_engine/routes/utils';
import { createBulkErrorObject } from '../../../../detection_engine/routes/utils';

import { createTimelines } from '../create_timelines';
import type { FrameworkRequest } from '../../../../framework';

import { CompareTimelinesStatus } from '../../../utils/compare_timelines_status';
import { TimelineStatusActions } from '../../../utils/common';
import { DEFAULT_ERROR } from '../../../utils/failure_cases';
import { createTimelinesStreamFromNdJson } from './create_timelines_stream_from_ndjson';
import { getTupleDuplicateErrorsAndUniqueTimeline } from './get_timelines_from_stream';
import type {
  ImportedTimeline,
  ImportRegular,
  ImportTimelineResponse,
  PromiseFromStreams,
} from './types';

const CHUNK_PARSED_OBJECT_SIZE = 10;

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

export const setTimeline = (
  parsedTimelineObject: Partial<ImportedTimeline>,
  parsedTimeline: ImportedTimeline,
  isTemplateTimeline: boolean
) => {
  return {
    ...parsedTimelineObject,
    status:
      parsedTimeline.status === TimelineStatus.draft
        ? TimelineStatus.active
        : parsedTimeline.status ?? TimelineStatus.active,
    templateTimelineVersion: isTemplateTimeline
      ? parsedTimeline.templateTimelineVersion ?? 1
      : null,
    templateTimelineId: isTemplateTimeline ? parsedTimeline.templateTimelineId ?? uuidv4() : null,
  };
};

export const importTimelines = async (
  file: Readable,
  maxTimelineImportExportSize: number,
  frameworkRequest: FrameworkRequest,
  isImmutable?: boolean
): Promise<ImportTimelineResultSchema | Error> => {
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
            try {
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
                savedObjectId,
                pinnedEventIds,
                globalNotes,
                eventNotes,
                status,
                templateTimelineId,
                templateTimelineVersion,
                title,
                timelineType,
                version,
              } = parsedTimeline;
              const parsedTimelineObject = omit(timelineSavedObjectOmittedFields, parsedTimeline);
              let newTimeline = null;

              try {
                const compareTimelinesStatus = new CompareTimelinesStatus({
                  status,
                  timelineType,
                  title,
                  timelineInput: {
                    id: savedObjectId,
                    version,
                  },
                  templateTimelineInput: {
                    id: templateTimelineId,
                    version: templateTimelineVersion,
                  },
                  frameworkRequest,
                });
                await compareTimelinesStatus.init();
                const isTemplateTimeline = compareTimelinesStatus.isHandlingTemplateTimeline;

                if (compareTimelinesStatus.isCreatableViaImport) {
                  // create timeline / timeline template
                  newTimeline = await createTimelines({
                    frameworkRequest,
                    timeline: setTimeline(parsedTimelineObject, parsedTimeline, isTemplateTimeline),
                    pinnedEventIds: isTemplateTimeline ? null : pinnedEventIds,
                    notes: isTemplateTimeline ? globalNotes : [...globalNotes, ...eventNotes],
                    isImmutable,
                    overrideNotesOwner: false,
                  });
                  resolve({
                    timeline_id: newTimeline.timeline.savedObjectId,
                    status_code: 200,
                    action: TimelineStatusActions.createViaImport,
                  });
                }

                if (!compareTimelinesStatus.isHandlingTemplateTimeline) {
                  const errorMessage = compareTimelinesStatus.checkIsFailureCases(
                    TimelineStatusActions.createViaImport
                  );
                  const message = errorMessage?.body ?? DEFAULT_ERROR;
                  resolve(
                    createBulkErrorObject({
                      id: savedObjectId ?? 'unknown',
                      statusCode: 409,
                      message,
                    })
                  );
                } else {
                  if (compareTimelinesStatus.isUpdatableViaImport) {
                    // update timeline template
                    newTimeline = await createTimelines({
                      frameworkRequest,
                      timeline: parsedTimelineObject,
                      timelineSavedObjectId: compareTimelinesStatus.timelineId,
                      timelineVersion: compareTimelinesStatus.timelineVersion,
                      notes: globalNotes,
                      existingNoteIds: compareTimelinesStatus.timelineInput.data?.noteIds,
                      isImmutable,
                      overrideNotesOwner: false,
                    });
                    resolve({
                      timeline_id: newTimeline.timeline.savedObjectId,
                      status_code: 200,
                      action: TimelineStatusActions.updateViaImport,
                    });
                  } else {
                    const errorMessage = compareTimelinesStatus.checkIsFailureCases(
                      TimelineStatusActions.updateViaImport
                    );
                    const message = errorMessage?.body ?? DEFAULT_ERROR;
                    resolve(
                      createBulkErrorObject({
                        id:
                          savedObjectId ??
                          (templateTimelineId
                            ? `(template_timeline_id) ${templateTimelineId}`
                            : 'unknown'),
                        statusCode: 409,
                        message,
                      })
                    );
                  }
                }
              } catch (err) {
                resolve(
                  createBulkErrorObject({
                    id:
                      savedObjectId ??
                      (templateTimelineId
                        ? `(template_timeline_id) ${templateTimelineId}`
                        : 'unknown'),
                    statusCode: 400,
                    message: err.message,
                  })
                );
              }
            } catch (error) {
              reject(error);
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

  const errorsResp = importTimelineResponse.filter((resp) => {
    return isBulkError(resp);
  }) as BulkError[];
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
    timelines_installed: timelinesInstalled.length ?? 0,
    timelines_updated: timelinesUpdated.length ?? 0,
  };
  const [validated, errors] = validate(importTimelinesRes, importTimelineResultSchema);
  if (errors != null || validated == null) {
    return new Error(errors || 'Import timeline error');
  } else {
    return validated;
  }
};
