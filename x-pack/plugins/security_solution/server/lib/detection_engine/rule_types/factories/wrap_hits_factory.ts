/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_UUID } from '@kbn/rule-data-utils';

import type { ConfigType } from '../../../../config';
import { filterDuplicateSignals } from '../../signals/filter_duplicate_signals';
import { SimpleHit, WrapHits } from '../../signals/types';
import { CompleteRule, RuleParams } from '../../schemas/rule_schemas';
import { generateId } from '../../signals/utils';
import { buildBulkBody } from './utils/build_bulk_body';

export const wrapHitsFactory =
  ({
    completeRule,
    ignoreFields,
    mergeStrategy,
    spaceId,
  }: {
    completeRule: CompleteRule<RuleParams>;
    ignoreFields: ConfigType['alertIgnoreFields'];
    mergeStrategy: ConfigType['alertMergeStrategy'];
    spaceId: string | null | undefined;
  }): WrapHits =>
  (events, buildReasonMessage) => {
    const wrappedDocs = events.map((event) => {
      const id = generateId(
        event._index,
        event._id,
        String(event._version),
        `${spaceId}:${completeRule.alertId}`
      );
      return {
        _id: id,
        _index: '',
        _source: {
          ...buildBulkBody(
            spaceId,
            completeRule,
            event as SimpleHit,
            mergeStrategy,
            ignoreFields,
            true,
            buildReasonMessage
          ),
          [ALERT_UUID]: id,
        },
      };
    });

    return filterDuplicateSignals(completeRule.alertId, wrappedDocs, true);
  };
