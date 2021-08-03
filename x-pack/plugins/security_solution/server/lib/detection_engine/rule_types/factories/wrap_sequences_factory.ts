/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchAfterAndBulkCreateParams, WrapSequences } from '../../signals/types';
import { buildAlertGroupFromSequence } from './utils/build_alert_group_from_sequence';
import { ConfigType } from '../../../../config';
import { WrappedRACAlert } from '../types';

export const wrapSequencesFactory = ({
  ruleSO,
  mergeStrategy,
}: {
  ruleSO: SearchAfterAndBulkCreateParams['ruleSO'];
  mergeStrategy: ConfigType['alertMergeStrategy'];
}): WrapSequences => (sequences) =>
  sequences.reduce(
    (acc: WrappedRACAlert[], sequence) => [
      ...acc,
      ...buildAlertGroupFromSequence(sequence, ruleSO, mergeStrategy),
    ],
    []
  );
