/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SearchAfterAndBulkCreateParams,
  SignalSource,
  SimpleHit,
  WrappedSignalHit,
  WrapSequences,
} from './types';
import { buildSignalGroupFromSequence } from './build_bulk_body';
import { filterDuplicateSignals } from './filter_duplicate_signals';
import { EqlSequence } from '../../../../common/detection_engine/types';

const isSignalSourceSequence = (
  sequences: Array<EqlSequence<SignalSource | unknown>>,
  isRuleRegistryEnabled: boolean
): sequences is Array<EqlSequence<SignalSource>> => {
  return !isRuleRegistryEnabled;
};

export const wrapSequencesFactory = ({
  ruleSO,
  signalsIndex,
  isRuleRegistryEnabled,
}: {
  ruleSO: SearchAfterAndBulkCreateParams['ruleSO'];
  signalsIndex: string;
  isRuleRegistryEnabled: boolean;
}): WrapSequences => (sequences) => {
  let wrappedDocs: SimpleHit[];
  if (isSignalSourceSequence(sequences, isRuleRegistryEnabled)) {
    wrappedDocs = sequences.reduce(
      (acc: WrappedSignalHit[], sequence) =>
        acc.concat(buildSignalGroupFromSequence(sequence, ruleSO, signalsIndex)),
      []
    );
  } else {
    // todo: wrap sequences for RAC
    wrappedDocs = [];
  }

  return filterDuplicateSignals(ruleSO.id, wrappedDocs, isRuleRegistryEnabled);
};
