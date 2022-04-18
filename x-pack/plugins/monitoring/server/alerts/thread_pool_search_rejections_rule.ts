/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule } from '@kbn/alerting-plugin/common';
import { ThreadPoolRejectionsRuleBase } from './thread_pool_rejections_rule_base';
import { RULE_THREAD_POOL_SEARCH_REJECTIONS, RULE_DETAILS } from '../../common/constants';

export class ThreadPoolSearchRejectionsRule extends ThreadPoolRejectionsRuleBase {
  private static TYPE = RULE_THREAD_POOL_SEARCH_REJECTIONS;
  private static THREAD_POOL_TYPE = 'search';
  private static readonly LABEL = RULE_DETAILS[RULE_THREAD_POOL_SEARCH_REJECTIONS].label;
  constructor(sanitizedRule?: Rule) {
    super(
      sanitizedRule,
      ThreadPoolSearchRejectionsRule.TYPE,
      ThreadPoolSearchRejectionsRule.THREAD_POOL_TYPE,
      ThreadPoolSearchRejectionsRule.LABEL,
      ThreadPoolRejectionsRuleBase.createActionVariables(
        ThreadPoolSearchRejectionsRule.THREAD_POOL_TYPE
      )
    );
  }
}
