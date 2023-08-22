/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type { Moment } from 'moment';
import { ALERT_SUPPRESSION_DOCS_COUNT, ALERT_INSTANCE_ID } from '@kbn/rule-data-utils';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/detection_engine/schemas/alerts';
import type { ConfigType } from '../../../../config';
import type { CompleteRule, EsqlRuleParams } from '../../rule_schema';
import { buildReasonMessageForNewTermsAlert } from '../utils/reason_formatters';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { buildBulkBody } from '../factories/utils/build_bulk_body';
import type { EsqlTable } from './esql_request';

import { rowToDocument, pickCells } from './utils';

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
  // TODO latest fields
}): Array<WrappedFieldsLatest<any>> => {
  const duplicatesMap = new Map<string, number>();
  const wrapped = results.values
    .slice(0, completeRule.ruleParams.maxSignals)
    .reduce<Array<WrappedFieldsLatest<any>>>((acc, row, i) => {
      const ruleRunId = tuple.from.toISOString() + tuple.to.toISOString();
      const id = objectHash([
        ruleRunId,
        completeRule.ruleParams.query,
        `${spaceId}:${completeRule.alertId}`,
        //  i,
        suppressionFields.length ? pickCells(results.columns, row, suppressionFields) : i,
      ]);

      if (duplicatesMap.has(id)) {
        duplicatesMap.set(id, (duplicatesMap.get(id) ?? 0) + 1);
        return acc;
      } else {
        duplicatesMap.set(id, 0);
      }

      //   duplicatesMap.set(id, 0);

      console.log('>>>> pickCells', pickCells(results.columns, row, suppressionFields));
      const instanceId = objectHash([
        completeRule.ruleParams.query,
        `${spaceId}:${completeRule.alertId}`,
        suppressionFields.length ? pickCells(results.columns, row, suppressionFields) : ruleRunId,
        // row.slice(1),
        //   pickCells(results.columns, row, ['destination.domain']).join(),
      ]);

      const document = rowToDocument(results.columns, row);
      // TODO: make it good looking
      delete document._id;
      delete document._version;
      delete document._index;

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

      acc.push({
        _id: id,
        _index: '',
        _source: {
          ...baseAlert,
          //    [ALERT_SUPPRESSION_TERMS]: suppressionFields ?? [],
          [ALERT_SUPPRESSION_DOCS_COUNT]: duplicatesMap.get(id) ?? 0,
          [ALERT_INSTANCE_ID]: instanceId,
        },
      });

      return acc;
    }, []);

  return wrapped.map((x) => {
    if (duplicatesMap.has(x._id)) {
      //  delete x._source[ALERT_SUPPRESSION_DOCS_COUNT];

      x._source[ALERT_SUPPRESSION_DOCS_COUNT] = duplicatesMap.get(x._id);
    }
    return x;
  });
};
