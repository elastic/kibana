/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import { DELETED_RULE } from '../../../../detection_engine/rule_details_ui/pages/rule_details/translations';
import { CreatedBy, UpdatedBy } from '../../../../detections/components/rules/rule_info';
import {
  RULE_OVERVIEW_TITLE_TEST_ID,
  RULE_OVERVIEW_RULE_CREATED_BY_TEST_ID,
  RULE_OVERVIEW_RULE_UPDATED_BY_TEST_ID,
  RULE_OVERVIEW_RULE_TITLE_SUPPRESSED_TEST_ID,
} from './test_ids';
import type { RuleResponse } from '../../../../../common/api/detection_engine';

export interface RuleTitleProps {
  /**
   * Rule object that represents relevant information about a rule
   */
  rule: RuleResponse;
  /**
   * Flag to indicate if rule is suppressed
   */
  isSuppressed: boolean;
}

/**
 * Title component that shows basic information of a rule. This is displayed above rule overview body
 */
export const RuleTitle: React.FC<RuleTitleProps> = ({ rule, isSuppressed }) => {
  return (
    <div data-test-subj={RULE_OVERVIEW_TITLE_TEST_ID}>
      <EuiTitle>
        <h6>{rule.name}</h6>
      </EuiTitle>
      {isSuppressed && (
        <>
          <EuiSpacer size="s" />
          <EuiBadge data-test-subj={RULE_OVERVIEW_RULE_TITLE_SUPPRESSED_TEST_ID} title="">
            {DELETED_RULE}
          </EuiBadge>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" direction="column">
        <EuiFlexItem data-test-subj={RULE_OVERVIEW_RULE_CREATED_BY_TEST_ID}>
          <EuiText size="xs">
            <CreatedBy createdBy={rule?.created_by} createdAt={rule?.created_at} />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem data-test-subj={RULE_OVERVIEW_RULE_UPDATED_BY_TEST_ID}>
          <EuiText size="xs">
            <UpdatedBy updatedBy={rule?.updated_by} updatedAt={rule?.updated_at} />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

RuleTitle.displayName = 'RuleTitle';
