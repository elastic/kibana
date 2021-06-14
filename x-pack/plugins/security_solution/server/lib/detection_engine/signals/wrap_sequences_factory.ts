/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchAfterAndBulkCreateParams, WrappedSignalHit, WrapSequences } from './types';
import { buildSignalGroupFromSequence } from './build_bulk_body';
import { filterDuplicateSignals } from './filter_duplicate_signals';

export const wrapSequencesFactory = ({
  ruleSO,
  signalsIndex,
}: {
  ruleSO: SearchAfterAndBulkCreateParams['ruleSO'];
  signalsIndex: string;
}): WrapSequences => (sequences) => {
  const wrappedDocs = sequences.reduce(
    (acc: WrappedSignalHit[], sequence) =>
      acc.concat(buildSignalGroupFromSequence(sequence, ruleSO, signalsIndex)),
    []
  );

  return filterDuplicateSignals(ruleSO.id, wrappedDocs, false);
};
