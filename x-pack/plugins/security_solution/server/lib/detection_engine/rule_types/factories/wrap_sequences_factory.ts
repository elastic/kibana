/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SearchAfterAndBulkCreateParams,
  WrappedSignalHit,
  WrapSequences,
} from '../../signals/types';
import { buildSignalGroupFromSequence } from '../../signals/build_bulk_body';
import { ConfigType } from '../../../../config';

export const wrapSequencesFactory = <T>({
  ruleSO,
  signalsIndex,
  mergeStrategy,
}: {
  ruleSO: SearchAfterAndBulkCreateParams<T>['ruleSO'];
  signalsIndex: string;
  mergeStrategy: ConfigType['alertMergeStrategy'];
}): WrapSequences<T> => (sequences) =>
  sequences.reduce(
    (acc: WrappedSignalHit[], sequence) => [
      ...acc,
      ...buildSignalGroupFromSequence(sequence, ruleSO, signalsIndex, mergeStrategy),
    ],
    []
  );
