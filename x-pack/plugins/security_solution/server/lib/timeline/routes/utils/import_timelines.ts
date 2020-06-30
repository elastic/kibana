/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { has } from 'lodash/fp';
import { createBulkErrorObject, BulkError } from '../../../detection_engine/routes/utils';
import { SavedTimeline } from '../../../../../common/types/timeline';
import { NoteResult } from '../../../../graphql/types';
import { HapiReadableStream } from '../../../detection_engine/rules/types';

export interface ImportTimelinesSchema {
  success: boolean;
  success_count: number;
  errors: BulkError[];
}

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
}

export type ImportTimelineResponse = ImportRegular | BulkError;
export type PromiseFromStreams = ImportedTimeline;
export interface ImportTimelinesRequestParams {
  body: { file: HapiReadableStream };
}

export const getTupleDuplicateErrorsAndUniqueTimeline = (
  timelines: PromiseFromStreams[],
  isOverwrite: boolean
): [BulkError[], PromiseFromStreams[]] => {
  const { errors, timelinesAcc } = timelines.reduce(
    (acc, parsedTimeline) => {
      if (parsedTimeline instanceof Error) {
        acc.timelinesAcc.set(uuid.v4(), parsedTimeline);
      } else {
        const { savedObjectId } = parsedTimeline;
        if (savedObjectId != null) {
          if (acc.timelinesAcc.has(savedObjectId) && !isOverwrite) {
            acc.errors.set(
              uuid.v4(),
              createBulkErrorObject({
                id: savedObjectId,
                statusCode: 400,
                message: `More than one timeline with savedObjectId: "${savedObjectId}" found`,
              })
            );
          }
          acc.timelinesAcc.set(savedObjectId, parsedTimeline);
        } else {
          acc.timelinesAcc.set(uuid.v4(), parsedTimeline);
        }
      }

      return acc;
    }, // using map (preserves ordering)
    {
      errors: new Map<string, BulkError>(),
      timelinesAcc: new Map<string, PromiseFromStreams>(),
    }
  );

  return [Array.from(errors.values()), Array.from(timelinesAcc.values())];
};

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
