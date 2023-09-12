/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type { Moment } from 'moment';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import {
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
} from '@kbn/rule-data-utils';
import { computeIsESQLQueryAggregating } from '@kbn/securitysolution-utils';

import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { ConfigType } from '../../../../config';
import type { CompleteRule, EsqlRuleParams } from '../../rule_schema';
import { buildReasonMessageForNewTermsAlert } from '../utils/reason_formatters';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { buildBulkBody } from '../factories/utils/build_bulk_body';
import type { EsqlTable } from './esql_request';
import { rowToDocument, pickCells } from './utils';

import type { SignalSource } from '../types';

export const wrapGroupedEsqlAlerts = ({
  results,
  spaceId,
  completeRule,
  mergeStrategy,
  alertTimestampOverride,
  ruleExecutionLogger,
  publicBaseUrl,
  tuple,
  suppressionFields,
}: {
  results: EsqlTable;
  spaceId: string | null | undefined;
  completeRule: CompleteRule<EsqlRuleParams>;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  alertTimestampOverride: Date | undefined;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  publicBaseUrl: string | undefined;
  suppressionFields: string[];
  tuple: {
    to: Moment;
    from: Moment;
    maxSignals: number;
  };
}): Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>> => {
  const duplicatesMap = new Map<string, number>();
  const wrapped = results.values
    .slice(0, completeRule.ruleParams.maxSignals)
    .reduce<Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>>>(
      (acc, row, i) => {
        const ruleRunId = tuple.from.toISOString() + tuple.to.toISOString();
        const isRuleAggregating = computeIsESQLQueryAggregating(completeRule.ruleParams.query);

        const document = rowToDocument(results.columns, row);

        // for aggregating rules when metadata _id is present, generate alert based on ES document event id
        const id =
          isRuleAggregating && document._id
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
                suppressionFields.length ? pickCells(results.columns, row, suppressionFields) : i,
              ]);

        if (duplicatesMap.has(id)) {
          duplicatesMap.set(id, (duplicatesMap.get(id) ?? 0) + 1);
          return acc;
        } else {
          duplicatesMap.set(id, 0);
        }

        // instance id needed for ES|QL suppression
        const instanceId = objectHash([
          completeRule.ruleParams.query,
          `${spaceId}:${completeRule.alertId}`,
          suppressionFields.length ? pickCells(results.columns, row, suppressionFields) : ruleRunId,
        ]);

        // metadata fields need to be excluded from source, otherwise alerts creation fails
        const { _id, _version, _index, ...source } = document;

        const baseAlert: BaseFieldsLatest = buildBulkBody(
          spaceId,
          completeRule,
          {
            _source: source as SignalSource,
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

        acc.push({
          _id: id,
          _index: _index ?? '',
          // TODO:ESQL
          // @ts-expect-error needs to be create in a separate function
          _source: {
            ...baseAlert,
            ...(suppressionFields.length
              ? {
                  [ALERT_SUPPRESSION_TERMS]: suppressionFields.map((field) => ({
                    field,
                    value: source[field],
                  })),
                  [ALERT_SUPPRESSION_DOCS_COUNT]: duplicatesMap.get(id) ?? 0,
                  [ALERT_INSTANCE_ID]: instanceId,
                  [ALERT_SUPPRESSION_START]: tuple.from.toDate(),
                  [ALERT_SUPPRESSION_END]: tuple.to.toDate(),
                }
              : { [ALERT_SUPPRESSION_DOCS_COUNT]: 0, [ALERT_INSTANCE_ID]: instanceId }),
          },
        });

        return acc;
      },
      []
    );

  return wrapped.map((alert) => {
    const duplicateCount = duplicatesMap.get(alert._id);
    if (duplicateCount) {
      alert._source[ALERT_SUPPRESSION_DOCS_COUNT] = duplicateCount;
    }
    return alert;
  });
};
