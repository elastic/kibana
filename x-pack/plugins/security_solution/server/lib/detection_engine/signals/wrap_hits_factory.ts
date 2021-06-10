/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SearchAfterAndBulkCreateParams,
  SignalSourceHit,
  WrapHits,
  WrappedSignalHit,
} from './types';
import { generateId } from './utils';
import { buildBulkBody } from './build_bulk_body';
import { filterDuplicateSignals } from './filter_duplicate_signals';

export const wrapHitsFactory = ({
  ruleSO,
  signalsIndex,
}: {
  ruleSO: SearchAfterAndBulkCreateParams['ruleSO'];
  signalsIndex: string;
}): WrapHits => (events) => {
  const wrappedDocs: WrappedSignalHit[] = events.flatMap((doc) => [
    {
      _index: signalsIndex,
      // TODO: bring back doc._version
      _id: generateId(doc._index, doc._id, '', ruleSO.attributes.params.ruleId ?? ''),
      _source: buildBulkBody(ruleSO, doc as SignalSourceHit),
    },
  ]);

  return filterDuplicateSignals(ruleSO.id, wrappedDocs);
};
