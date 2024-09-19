/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import { UserRulesHit, UserRulesFields, UserRulesByUser } from '../../../../../../common';
import { formatHostRulesData } from '../host_rules/helpers';

export const formatUserRulesData = (buckets: UserRulesHit[]): UserRulesByUser[] =>
  buckets.map((user) => ({
    _id: user.key,
    [UserRulesFields.userName]: user.key,
    [UserRulesFields.riskScore]: getOr(0, 'risk_score.value', user),
    [UserRulesFields.ruleCount]: getOr(0, 'rule_count.value', user),
    [UserRulesFields.rules]: formatHostRulesData(getOr([], 'rule_name.buckets', user)),
  }));
