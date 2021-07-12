/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigType } from '../../../config';
import { buildBulkBody } from '../signals/build_bulk_body';
import { filterDuplicateSignals } from '../signals/filter_duplicate_signals';
import { SearchAfterAndBulkCreateParams, WrapHits, WrappedSignalHit } from '../signals/types';
import { generateId } from '../signals/utils';

export const wrapHitsFactory = ({
  ruleSO,
  signalsIndex,
  mergeStrategy,
}: {
  ruleSO: SearchAfterAndBulkCreateParams['ruleSO'];
  signalsIndex: string;
  mergeStrategy: ConfigType['alertMergeStrategy'];
}): WrapHits => (events) => {
  const wrappedDocs: WrappedSignalHit[] = events.flatMap((doc) => [
    {
      _index: signalsIndex,
      _id: generateId(
        doc._index,
        doc._id,
        String(doc._version),
        ruleSO.attributes.params.ruleId ?? ''
      ),
      _source: buildBulkBody(ruleSO, doc, mergeStrategy),
    },
  ]);

  return filterDuplicateSignals(ruleSO.id, wrappedDocs, false);
};
