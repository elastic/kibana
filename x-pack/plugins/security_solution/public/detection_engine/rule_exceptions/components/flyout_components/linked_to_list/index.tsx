/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiTitle, EuiSpacer, EuiPanel, EuiInMemoryTable } from '@elastic/eui';
import styled, { css } from 'styled-components';
import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';

import * as i18n from './translations';
import type { RuleReferences } from '../../../logic/use_find_references';
import { useFindExceptionListReferences } from '../../../logic/use_find_references';
import type { RuleReferenceSchema } from '../../../../../../common/detection_engine/schemas/response';
import { getAddToListsTableColumns } from '../add_to_lists_table/utils';

export interface TableListInterface extends ExceptionListSchema {
  references: RuleReferenceSchema[];
}

interface ExceptionsLinkedToListComponentProps {
  list: ExceptionListSchema;
  updateReferences: (refs: RuleReferences | null) => void;
}

const SectionHeader = styled(EuiTitle)`
  ${() => css`
    font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  `}
`;

const ExceptionsLinkedToListsComponent: React.FC<ExceptionsLinkedToListComponentProps> = ({
  list,
  updateReferences,
}): JSX.Element => {
  const [listsToDisplay, setListsToDisplay] = useState<TableListInterface[]>([]);

  const [isLoadingReferences, ruleReferences] = useFindExceptionListReferences([
    { id: list.id, list_id: list.list_id, namespace_type: list.namespace_type, type: list.type },
  ]);

  useEffect(() => {
    if (!isLoadingReferences) {
      const references = ruleReferences != null ? ruleReferences[list.list_id] : [];
      const transformedData = {
        ...list,
        references,
      };

      setListsToDisplay([transformedData]);
      updateReferences(ruleReferences);
    }
  }, [list, isLoadingReferences, ruleReferences, updateReferences]);

  return (
    <EuiPanel
      paddingSize="none"
      hasShadow={false}
      data-test-subj="exceptionItemAddToRuleOrListSection"
    >
      <SectionHeader size="xs">
        <h3>{i18n.LINKED_TO_LIST_TITLE}</h3>
      </SectionHeader>
      <EuiSpacer size="s" />
      <EuiInMemoryTable<TableListInterface>
        tableCaption="Table of exception lists"
        itemId="id"
        items={listsToDisplay}
        columns={getAddToListsTableColumns()}
        isSelectable={false}
        sorting
        data-test-subj="exceptionItemSharedList"
      />
    </EuiPanel>
  );
};

export const ExceptionsLinkedToLists = React.memo(ExceptionsLinkedToListsComponent);

ExceptionsLinkedToLists.displayName = 'ExceptionsLinkedToLists';
