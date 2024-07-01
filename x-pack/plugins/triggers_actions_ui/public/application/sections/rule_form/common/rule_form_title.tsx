/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiTitle } from '@elastic/eui';
import { RuleTypeIndex } from '@kbn/triggers-actions-ui-types';
import React from 'react';
import { InitialRule } from '../rule_reducer';

export const RuleFormTitle = ({
  rule,
  ruleTypeIndex,
}: {
  rule: InitialRule;
  ruleTypeIndex: RuleTypeIndex;
}) => {
  return (
    <EuiFlexItem>
      <EuiTitle size="s" data-test-subj="selectedRuleTypeTitle">
        <h5 id="selectedRuleTypeTitle">
          {rule.ruleTypeId && ruleTypeIndex && ruleTypeIndex.has(rule.ruleTypeId)
            ? ruleTypeIndex.get(rule.ruleTypeId)!.name
            : ''}
        </h5>
      </EuiTitle>
    </EuiFlexItem>
  );
};
