/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiTitle, EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Rule } from '../../../detection_engine/rule_management/logic';
import { CreatedBy, UpdatedBy } from '../../../detections/components/rules/rule_info';
import {
  RULE_PREVIEW_TITLE_TEST_ID,
  RULE_PREVIEW_RULE_CREATED_BY_TEST_ID,
  RULE_PREVIEW_RULE_UPDATED_BY_TEST_ID,
} from './test_ids';

interface RulePreviewTitleProps {
  /**
   * Rule object that represents relevant information about a rule
   */
  rule: Rule;
}

/**
 * Title component that shows basic information of a rule. This is displayed above rule preview body in rule preview panel
 */
export const RulePreviewTitle: React.FC<RulePreviewTitleProps> = ({ rule }) => {
  return (
    <div data-test-subj={RULE_PREVIEW_TITLE_TEST_ID}>
      <EuiTitle>
        <h6>{rule.name}</h6>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" direction="column">
        <EuiFlexItem data-test-subj={RULE_PREVIEW_RULE_CREATED_BY_TEST_ID}>
          <EuiText size="xs">
            <CreatedBy createdBy={rule?.created_by} createdAt={rule?.created_at} />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem data-test-subj={RULE_PREVIEW_RULE_UPDATED_BY_TEST_ID}>
          <EuiText size="xs">
            <UpdatedBy updatedBy={rule?.updated_by} updatedAt={rule?.updated_at} />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

RulePreviewTitle.displayName = 'RulePreviewTitle';
