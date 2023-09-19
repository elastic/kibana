/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
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
import { buildBulkBody } from '../factories/utils/build_bulk_body';
import type { SignalSource } from '../types';

export const wrapEsqlAlerts = ({
  results,
  spaceId,
  completeRule,
  mergeStrategy,
  alertTimestampOverride,
  ruleExecutionLogger,
  publicBaseUrl,
  tuple,
  sourceDocuments,
  isRuleAggregating,
}: {
  isRuleAggregating: boolean;
  sourceDocuments: Record<string, { fields: estypes.SearchHit['fields'] }>;
  results: Array<Record<string, string | null>>;
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
  const wrapped = results.map<WrappedFieldsLatest<BaseFieldsLatest>>((document, i) => {
    const ruleRunId = tuple.from.toISOString() + tuple.to.toISOString();

    // for aggregating rules when metadata _id is present, generate alert based on ES document event id
    const id =
      !isRuleAggregating && document._id
        ? objectHash([
            document._id,
            document._version,
            document._index,
            `${spaceId}:${completeRule.alertId}`,
          ])
        : objectHash([
            ruleRunId,
            completeRule.ruleParams.query,
            `${spaceId}:${completeRule.alertId}`,
            i,
          ]);

    // metadata fields need to be excluded from source, otherwise alerts creation fails
    const { _id, _version, _index, ...source } = document;

    const baseAlert: BaseFieldsLatest = buildBulkBody(
      spaceId,
      completeRule,
      {
        _source: source as SignalSource,
        fields: _id ? sourceDocuments[_id]?.fields : undefined,
        _id: _id ?? '',
        _index: _index ?? '',
      },
      mergeStrategy,
      [],
      true,
      buildReasonMessageForNewTermsAlert,
      [],
      alertTimestampOverride,
      ruleExecutionLogger,
      id,
      publicBaseUrl
    );

    return {
      _id: id,
      _index: _index ?? '',
      _source: {
        ...baseAlert,
      },
    };
  });

  return wrapped;
};
