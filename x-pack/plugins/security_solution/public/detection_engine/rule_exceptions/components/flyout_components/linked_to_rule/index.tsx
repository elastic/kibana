/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInMemoryTable, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

import type { Rule } from '../../../../rule_management/logic/types';
import { getRulesTableColumn } from '../utils';
import * as i18n from './translations';

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
      <SectionHeader size="xs" data-test-subj="exceptionItemLinkedToRuleSection">
        <h3>{i18n.LINKED_TO_RULE_TITLE}</h3>
      </SectionHeader>
      <EuiSpacer size="s" />
      <EuiInMemoryTable<Rule>
        tableCaption="Rules table"
        itemId="id"
        items={[rule]}
        columns={getRulesTableColumn()}
        sorting
        data-test-subj="addExceptionToRulesTable"
      />
    </>
  );
};

export const ExceptionsLinkedToRule = React.memo(ExceptionsLinkedToRuleComponent);

ExceptionsLinkedToRule.displayName = 'ExceptionsLinkedToRule';
