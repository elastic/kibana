/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ConfigType } from '../../../../config';
import type { SignalSource, SimpleHit } from '../types';
import type { CompleteRule, RuleParams } from '../../rule_schema';
import { generateId } from '../utils/utils';
import { buildBulkBody } from './utils/build_bulk_body';
import type { BuildReasonMessage } from '../utils/reason_formatters';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';

export const wrapHitsFactory =
  ({
    completeRule,
    ignoreFields,
    mergeStrategy,
    spaceId,
    indicesToQuery,
    alertTimestampOverride,
    publicBaseUrl,
    ruleExecutionLogger,
  }: {
    completeRule: CompleteRule<RuleParams>;
    ignoreFields: ConfigType['alertIgnoreFields'];
    mergeStrategy: ConfigType['alertMergeStrategy'];
    spaceId: string | null | undefined;
    indicesToQuery: string[];
    alertTimestampOverride: Date | undefined;
    publicBaseUrl: string | undefined;
    ruleExecutionLogger: IRuleExecutionLogForExecutors;
  }) =>
  (
    events: Array<estypes.SearchHit<SignalSource>>,
    buildReasonMessage: BuildReasonMessage
  ): Array<WrappedFieldsLatest<BaseFieldsLatest>> => {
    const wrappedDocs = events.map((event): WrappedFieldsLatest<BaseFieldsLatest> => {
      const id = generateId(
        event._index,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        event._id!,
        String(event._version),
        `${spaceId}:${completeRule.alertId}`
      );

      const baseAlert = buildBulkBody(
        spaceId,
        completeRule,
        event as SimpleHit,
        mergeStrategy,
        ignoreFields,
        true,
        buildReasonMessage,
        indicesToQuery,
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
        },
      };
    });
    return wrappedDocs.filter(
      (doc) =>
        !doc._source['kibana.alert.ancestors'].some(
          (ancestor) => ancestor.rule === completeRule.alertId
        )
    );
  };
