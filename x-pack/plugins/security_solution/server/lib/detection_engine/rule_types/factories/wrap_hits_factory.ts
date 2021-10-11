/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CompleteRule, RuleParams } from '../../schemas/rule_schemas';
import { ConfigType } from '../../../../config';
import { SimpleHit, WrapHits } from '../../signals/types';
import { generateId } from '../../signals/utils';
import { buildBulkBody } from './utils/build_bulk_body';
import { filterDuplicateSignals } from '../../signals/filter_duplicate_signals';
import { WrappedRACAlert } from '../types';

export const wrapHitsFactory =
  ({
    completeRule,
    ignoreFields,
    mergeStrategy,
    signalsIndex,
    spaceId,
  }: {
    completeRule: CompleteRule<RuleParams>;
    ignoreFields: ConfigType['alertIgnoreFields'];
    mergeStrategy: ConfigType['alertMergeStrategy'];
    signalsIndex: string;
    spaceId: string | null | undefined;
  }): WrapHits =>
  (events, buildReasonMessage) => {
    const wrappedDocs: WrappedRACAlert[] = events.flatMap((event) => [
      {
        _index: signalsIndex,
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
      },
    ]);

    return filterDuplicateSignals(completeRule.alertId, wrappedDocs, false);
  };
