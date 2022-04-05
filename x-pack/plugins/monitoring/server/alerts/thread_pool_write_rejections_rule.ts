/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThreadPoolRejectionsRuleBase } from './thread_pool_rejections_rule_base';
import { RULE_THREAD_POOL_WRITE_REJECTIONS, RULE_DETAILS } from '../../common/constants';
import { Rule } from '../../../alerting/common';

export class ThreadPoolWriteRejectionsRule extends ThreadPoolRejectionsRuleBase {
  private static TYPE = RULE_THREAD_POOL_WRITE_REJECTIONS;
  private static THREAD_POOL_TYPE = 'write';
  private static readonly LABEL = RULE_DETAILS[RULE_THREAD_POOL_WRITE_REJECTIONS].label;
  constructor(sanitizedRule?: Rule) {
    super(
      sanitizedRule,
      ThreadPoolWriteRejectionsRule.TYPE,
      ThreadPoolWriteRejectionsRule.THREAD_POOL_TYPE,
      ThreadPoolWriteRejectionsRule.LABEL,
      ThreadPoolRejectionsRuleBase.createActionVariables(
        ThreadPoolWriteRejectionsRule.THREAD_POOL_TYPE
      )
    );
  }
}
