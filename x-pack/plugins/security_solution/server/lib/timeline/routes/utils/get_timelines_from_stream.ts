/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { createBulkErrorObject, BulkError } from '../../../detection_engine/routes/utils';
import { PromiseFromStreams } from './import_timelines';

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
