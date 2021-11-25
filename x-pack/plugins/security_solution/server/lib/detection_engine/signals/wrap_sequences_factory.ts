/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WrappedSignalHit, WrapSequences } from './types';
import { buildSignalGroupFromSequence } from './build_bulk_body';
import { ConfigType } from '../../../config';
import { CompleteRule, RuleParams } from '../schemas/rule_schemas';

export const wrapSequencesFactory =
  ({
    completeRule,
    signalsIndex,
    mergeStrategy,
    ignoreFields,
  }: {
    completeRule: CompleteRule<RuleParams>;
    signalsIndex: string;
    mergeStrategy: ConfigType['alertMergeStrategy'];
    ignoreFields: ConfigType['alertIgnoreFields'];
  }): WrapSequences =>
  (sequences, buildReasonMessage) =>
    sequences.reduce(
      (acc: WrappedSignalHit[], sequence) => [
        ...acc,
        ...buildSignalGroupFromSequence(
          sequence,
          completeRule,
          signalsIndex,
          mergeStrategy,
          ignoreFields,
          buildReasonMessage
        ),
      ],
      []
    );
