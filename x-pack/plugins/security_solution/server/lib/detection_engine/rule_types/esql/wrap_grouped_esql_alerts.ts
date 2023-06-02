/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type { Moment } from 'moment';
import { ALERT_INSTANCE_ID } from '@kbn/rule-data-utils';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/detection_engine/schemas/alerts';
import type { ConfigType } from '../../../../config';
import type { CompleteRule, EsqlRuleParams } from '../../rule_schema';
import { buildReasonMessageForNewTermsAlert } from '../utils/reason_formatters';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { buildBulkBody } from '../factories/utils/build_bulk_body';
import type { EsqlTable, EsqlResultRow, EsqlResultColumn } from './esql_request';

import { rowToDocument, pickCells } from './utils';

const retrieveGroupByFields = (esqlQuery: string, columns: EsqlResultColumn[]) => {
  // fields after the last ...by, will be the ones piped
  const lastBySection = esqlQuery.split('by').pop();
};

export const wrapGroupedEsqlAlerts = ({
  results,
  spaceId,
  completeRule,
  mergeStrategy,
  alertTimestampOverride,
  ruleExecutionLogger,
  publicBaseUrl,
  tuple,
}: {
  results: EsqlTable;
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
  // TODO latest fields
}): Array<WrappedFieldsLatest<any>> => {
  return results.values.slice(0, completeRule.ruleParams.maxSignals).map((row, i) => {
    const ruleRunId = tuple.from.toISOString() + tuple.to.toISOString();
    const id = objectHash([
      ruleRunId,
      completeRule.ruleParams.query,
      `${spaceId}:${completeRule.alertId}`,
      i,
    ]);

    const instanceId = objectHash([
      completeRule.ruleParams.query,
      `${spaceId}:${completeRule.alertId}`,
      row.slice(1),
      //   pickCells(results.columns, row, ['destination.domain']).join(),
    ]);

    const document = rowToDocument(results.columns, row);

    const baseAlert: BaseFieldsLatest = buildBulkBody(
      spaceId,
      completeRule,
      { _source: document },
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
      _index: '',
      _source: {
        ...baseAlert,
        [ALERT_INSTANCE_ID]: instanceId,
      },
    };
  });
};
