/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';

import { SearchAfterAndBulkCreateParams, WrapHits } from '../../signals/types';
import { buildBulkBody } from './utils/build_bulk_body';
import { generateId } from '../../signals/utils';
import { filterDuplicateSignals } from '../../signals/filter_duplicate_signals';
import type { ConfigType } from '../../../../config';
import { WrappedRACAlert } from '../types';

export const wrapHitsFactory = ({
  logger,
  ignoreFields,
  mergeStrategy,
  ruleSO,
  spaceId,
}: {
  logger: Logger;
  ruleSO: SearchAfterAndBulkCreateParams['ruleSO'];
  mergeStrategy: ConfigType['alertMergeStrategy'];
  ignoreFields: ConfigType['alertIgnoreFields'];
  spaceId: string | null | undefined;
}): WrapHits => (events, buildReasonMessage) => {
  try {
    const wrappedDocs: WrappedRACAlert[] = events.flatMap((doc) => [
      {
        _index: '',
        _id: generateId(
          doc._index,
          doc._id,
          String(doc._version),
          ruleSO.attributes.params.ruleId ?? ''
        ),
        _source: buildBulkBody(
          spaceId,
          ruleSO,
          doc,
          mergeStrategy,
          ignoreFields,
          true,
          buildReasonMessage
        ),
      },
    ]);

    return filterDuplicateSignals(ruleSO.id, wrappedDocs, true);
  } catch (error) {
    logger.error(error);
    return [];
  }
};
