/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { tryCatch, fold } from 'fp-ts/lib/Either';

import { DEPRECATION_WARNING_UPPER_LIMIT } from '../../../common/constants';
import { ReindexStep } from '../../../common/types';

export const validateRegExpString = (s: string) =>
  pipe(
    tryCatch(
      () => new RegExp(s),
      (e) => (e as Error).message
    ),
    fold(
      (errorMessage: string) => errorMessage,
      () => ''
    )
  );

/*
 * There isnt much difference between having 1M or 1.1M deprecation warnings, the number is
 * so big it beats the purpose of having a little preview of the count. With this we can also
 * prevent the container of the value to grow due to the value being so large.
 */
export const getDeprecationsUpperLimit = (count: number) => {
  if (count > DEPRECATION_WARNING_UPPER_LIMIT) {
    return `${DEPRECATION_WARNING_UPPER_LIMIT}+`;
  }

  return count.toString();
};

/*
 * Reindexing task consists of 4 steps: making the index read-only, creating a new index,
 * reindexing documents into the new index and switching alias from the old to the new index.
 * Steps 1, 2 and 4 each contribute 5% to the overall progress.
 * Step 3 (reindexing documents) can take a long time for large indices and its progress is calculated
 * between 10% and 95% of the overall progress depending on its completeness percentage.
 */
export const getReindexProgressLabel = (
  reindexTaskPercComplete: number | null,
  lastCompletedStep: ReindexStep | undefined
): string => {
  let percentsComplete = 0;
  switch (lastCompletedStep) {
    case ReindexStep.created:
      // the reindex task has just started, 0% progress
      percentsComplete = 0;
      break;
    case ReindexStep.readonly: {
      // step 1 completed, 5% progress
      percentsComplete = 5;
      break;
    }
    case ReindexStep.newIndexCreated: {
      // step 2 completed, 10% progress
      percentsComplete = 10;
      break;
    }
    case ReindexStep.reindexStarted: {
      // step 3 started, 10-95% progress depending on progress of reindexing documents in ES
      percentsComplete =
        reindexTaskPercComplete !== null ? 10 + Math.round(reindexTaskPercComplete * 85) : 10;
      break;
    }
    case ReindexStep.reindexCompleted: {
      // step 3 completed, only step 4 remaining, 95% progress
      percentsComplete = 95;
      break;
    }
    case ReindexStep.aliasCreated: {
      // step 4 completed, 100% progress
      percentsComplete = 100;
      break;
    }
  }
  return `${percentsComplete}%`;
};
