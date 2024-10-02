/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';

import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { ConfigType } from '../../../../config';
import type { CompleteRule, EsqlRuleParams } from '../../rule_schema';
import { buildReasonMessageForNewTermsAlert } from '../utils/reason_formatters';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { transformHitToAlert } from '../factories/utils/transform_hit_to_alert';
import type { SignalSource } from '../types';
import { generateAlertId } from './utils';

export const wrapEsqlAlerts = ({
  events,
  spaceId,
  completeRule,
  mergeStrategy,
  alertTimestampOverride,
  ruleExecutionLogger,
  publicBaseUrl,
  tuple,
  isRuleAggregating,
}: {
  isRuleAggregating: boolean;
  events: Array<estypes.SearchHit<SignalSource>>;
  spaceId: string | null | undefined;
  completeRule: CompleteRule<EsqlRuleParams>;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  alertTimestampOverride: Date | undefined;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  publicBaseUrl: string | undefined;
  tuple: {
    to: Moment;
    from: Moment;
    maxSignals: number;
  };
}): Array<WrappedFieldsLatest<BaseFieldsLatest>> => {
  const wrapped = events.map<WrappedFieldsLatest<BaseFieldsLatest>>((event, i) => {
    const id = generateAlertId({
      event,
      spaceId,
      completeRule,
      tuple,
      isRuleAggregating,
      index: i,
    });

    const baseAlert: BaseFieldsLatest = transformHitToAlert({
      spaceId,
      completeRule,
      doc: event,
      mergeStrategy,
      ignoreFields: {},
      ignoreFieldsRegexes: [],
      applyOverrides: true,
      buildReasonMessage: buildReasonMessageForNewTermsAlert,
      indicesToQuery: [],
      alertTimestampOverride,
      ruleExecutionLogger,
      alertUuid: id,
      publicBaseUrl,
    });

    return {
      _id: id,
      _index: event._index ?? '',
      _source: {
        ...baseAlert,
      },
    };
  });

  return wrapped;
};
