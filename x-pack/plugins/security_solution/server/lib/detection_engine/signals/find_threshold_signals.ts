/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';

import { Threshold } from '../../../../common/detection_engine/schemas/common/schemas';
import { singleSearchAfter } from './single_search_after';

import { AlertServices } from '../../../../../alerts/server';
import { Logger } from '../../../../../../../src/core/server';
import { SignalSearchResponse } from './types';

interface FindThresholdSignalsParams {
  from: string;
  to: string;
  inputIndexPattern: string[];
  services: AlertServices;
  logger: Logger;
  filter: unknown;
  threshold: Threshold;
}

export const findThresholdSignals = async ({
  from,
  to,
  inputIndexPattern,
  services,
  logger,
  filter,
  threshold,
}: FindThresholdSignalsParams): Promise<{
  searchResult: SignalSearchResponse;
  searchDuration: string;
}> => {
  const aggregations =
    threshold && !isEmpty(threshold.field)
      ? {
          threshold: {
            terms: {
              field: threshold.field,
              min_doc_count: threshold.value,
            },
          },
        }
      : {};

  return singleSearchAfter({
    aggregations,
    searchAfterSortId: undefined,
    timestampOverride: undefined,
    index: inputIndexPattern,
    from,
    to,
    services,
    logger,
    filter,
    pageSize: 0,
  });
};
