/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WrapSequences } from '../types';
import { buildAlertGroupFromSequence } from './build_alert_group_from_sequence';
import type { ConfigType } from '../../../../config';
import type { CompleteRule, RuleParams } from '../../rule_schema';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/detection_engine/schemas/alerts';

export const wrapSequencesFactory =
  ({
    ruleExecutionLogger,
    completeRule,
    ignoreFields,
    mergeStrategy,
    spaceId,
    indicesToQuery,
    alertTimestampOverride,
  }: {
    ruleExecutionLogger: IRuleExecutionLogForExecutors;
    completeRule: CompleteRule<RuleParams>;
    ignoreFields: ConfigType['alertIgnoreFields'];
    mergeStrategy: ConfigType['alertMergeStrategy'];
    spaceId: string | null | undefined;
    indicesToQuery: string[];
    alertTimestampOverride: Date | undefined;
  }): WrapSequences =>
  (sequences, buildReasonMessage) =>
    sequences.reduce(
      (acc: Array<WrappedFieldsLatest<BaseFieldsLatest>>, sequence) => [
        ...acc,
        ...buildAlertGroupFromSequence(
          ruleExecutionLogger,
          sequence,
          completeRule,
          mergeStrategy,
          spaceId,
          buildReasonMessage,
          indicesToQuery,
          alertTimestampOverride
        ),
      ],
      []
    );
