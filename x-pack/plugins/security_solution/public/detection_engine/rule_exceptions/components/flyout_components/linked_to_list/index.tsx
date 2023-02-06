/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiTitle, EuiSpacer, EuiPanel, EuiInMemoryTable, EuiLoadingContent } from '@elastic/eui';
import styled, { css } from 'styled-components';

import * as i18n from './translations';
import type { ExceptionListRuleReferencesSchema } from '../../../../../../common/detection_engine/rule_exceptions';
import { getSharedListsTableColumns } from '../utils';

interface ExceptionsLinkedToListComponentProps {
  isLoadingReferences: boolean;
  errorFetchingReferences: boolean;
  listAndReferences: ExceptionListRuleReferencesSchema[];
}

const SectionHeader = styled(EuiTitle)`
  ${() => css`
    font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  `}
`;

const ExceptionsLinkedToListsComponent: React.FC<ExceptionsLinkedToListComponentProps> = ({
  isLoadingReferences,
  errorFetchingReferences,
  listAndReferences,
}): JSX.Element => {
  const [message, setMessage] = useState<JSX.Element | string | undefined>(
    <EuiLoadingContent lines={4} data-test-subj="exceptionItemListsTableLoading" />
  );
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (errorFetchingReferences) {
      setError(i18n.LINKED_TO_LIST_ERROR);
    } else if (!isLoadingReferences) {
      setMessage(undefined);
    }
  }, [errorFetchingReferences, isLoadingReferences]);

  return (
    <EuiPanel
      paddingSize="none"
      hasShadow={false}
      data-test-subj="exceptionItemLinkedToListSection"
    >
      <SectionHeader size="xs">
        <h3>{i18n.LINKED_TO_LIST_TITLE}</h3>
      </SectionHeader>
      <EuiSpacer size="s" />
      <EuiInMemoryTable<ExceptionListRuleReferencesSchema>
        tableCaption="Table of exception lists"
        itemId="id"
        message={message}
        loading={isLoadingReferences}
        items={listAndReferences}
        error={error}
        columns={getSharedListsTableColumns()}
        isSelectable={false}
        sorting
        data-test-subj="exceptionItemSharedList"
      />
    </EuiPanel>
  );
};

export const ExceptionsLinkedToLists = React.memo(ExceptionsLinkedToListsComponent);

ExceptionsLinkedToLists.displayName = 'ExceptionsLinkedToLists';
