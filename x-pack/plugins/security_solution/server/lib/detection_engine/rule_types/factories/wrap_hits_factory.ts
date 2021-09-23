/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';

import type { ConfigType } from '../../../../config';
import { filterDuplicateSignals } from '../../signals/filter_duplicate_signals';
import { SearchAfterAndBulkCreateParams, SimpleHit, WrapHits } from '../../signals/types';
import { generateId } from '../../signals/utils';
import { buildBulkBody } from './utils/build_bulk_body';
import { SanitizedRuleConfig } from '../../../../../../alerting/common';
import { CompleteRule, RuleParams } from '../../schemas/rule_schemas';

export const wrapHitsFactory =
  ({
    logger,
    ignoreFields,
    mergeStrategy,
    completeRule,
    spaceId,
  }: {
    logger: Logger;
    ruleConfig: SanitizedRuleConfig;
    completeRule: CompleteRule;
    mergeStrategy: ConfigType['alertMergeStrategy'];
    ignoreFields: ConfigType['alertIgnoreFields'];
    spaceId: string | null | undefined;
  }): WrapHits =>
  (events, buildReasonMessage) => {
    try {
      const wrappedDocs = events.map((event) => {
        return {
          _index: '',
          _id: generateId(
            event._index,
            event._id,
            String(event._version),
            completeRule.ruleParams.ruleId ?? ''
          ),
          _source: buildBulkBody(
            spaceId,
            completeRule,
            event as SimpleHit,
            mergeStrategy,
            ignoreFields,
            true,
            buildReasonMessage
          ),
        };
      });

      return filterDuplicateSignals(completeRule.alertId, wrappedDocs, true);
    } catch (error) {
      logger.error(error);
      return [];
    }
  };
