/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiSpacer, EuiInMemoryTable } from '@elastic/eui';
import styled, { css } from 'styled-components';

import * as i18n from './translations';
import type { Rule } from '../../../../../detections/containers/detection_engine/rules/types';
import { SecuritySolutionLinkAnchor } from '../../../../../common/components/links';
import { getRuleDetailsTabUrl } from '../../../../../common/components/link_to/redirect_to_detection_engine';
import { SecurityPageName } from '../../../../../../common/constants';
import { RuleDetailTabs } from '../../../../../detections/pages/detection_engine/rules/details';

const getAddToRulesTableColumns = () => [
  {
    field: 'name',
    name: 'Name',
    sortable: true,
    'data-test-subj': 'ruleNameCell',
  },
  {
    name: 'Actions',
    actions: [
      {
        'data-test-subj': 'ruleAction-view',
        render: (rule: Rule) => {
          return (
            <SecuritySolutionLinkAnchor
              data-test-subj="ruleName"
              deepLinkId={SecurityPageName.rules}
              path={getRuleDetailsTabUrl(rule.id, RuleDetailTabs.alerts)}
              external
            >
              {'View rule details'}
            </SecuritySolutionLinkAnchor>
          );
        },
      },
    ],
  },
];

interface ExceptionsLinkedToRuleComponentProps {
  rule: Rule;
}

const SectionHeader = styled(EuiTitle)`
  ${() => css`
    font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  `}
`;

const ExceptionsLinkedToRuleComponent: React.FC<ExceptionsLinkedToRuleComponentProps> = ({
  rule,
}): JSX.Element => {
  return (
    <>
      <SectionHeader size="xs">
        <h3>{i18n.LINKED_TO_RULE_TITLE}</h3>
      </SectionHeader>
      <EuiSpacer size="s" />
      <EuiInMemoryTable<Rule>
        tableCaption="Rules table"
        itemId="id"
        items={[rule]}
        columns={getAddToRulesTableColumns()}
        sorting
        data-test-subj="addExceptionToRulesTable"
      />
    </>
  );
};

export const ExceptionsLinkedToRule = React.memo(ExceptionsLinkedToRuleComponent);

ExceptionsLinkedToRule.displayName = 'ExceptionsLinkedToRule';
