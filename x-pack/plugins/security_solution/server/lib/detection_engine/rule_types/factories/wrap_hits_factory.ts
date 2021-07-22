/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchAfterAndBulkCreateParams, SignalSourceHit, WrapHits } from '../../signals/types';
import { buildBulkBody } from './utils/build_bulk_body';
import { generateId } from '../../signals/utils';
import { filterDuplicateSignals } from '../../signals/filter_duplicate_signals';
import type { ConfigType } from '../../../../config';
import { WrappedRACAlert } from '../types';

export const wrapHitsFactory = ({
  ruleSO,
  signalsIndex,
  mergeStrategy,
}: {
  ruleSO: SearchAfterAndBulkCreateParams['ruleSO'];
  signalsIndex: string;
  mergeStrategy: ConfigType['alertMergeStrategy'];
}): WrapHits => (events) => {
  const wrappedDocs: WrappedRACAlert[] = events.flatMap((doc) => [
    {
      _index: signalsIndex,
      _id: generateId(
        doc._index,
        doc._id,
        String(doc._version),
        ruleSO.attributes.params.ruleId ?? ''
      ),
      _source: buildBulkBody(ruleSO, doc as SignalSourceHit, mergeStrategy),
    },
  ]);

  return filterDuplicateSignals(ruleSO.id, wrappedDocs, true);
};
