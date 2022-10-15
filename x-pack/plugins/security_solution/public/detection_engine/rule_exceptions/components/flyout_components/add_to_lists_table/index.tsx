/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import { EuiText, EuiSpacer, EuiInMemoryTable, EuiPanel, EuiLoadingContent } from '@elastic/eui';
import type { ExceptionListSchema, ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import type { FindRulesReferencedByExceptionsListProp } from '../../../../rule_management/logic';
import * as i18n from './translations';
import { getSharedListsTableColumns } from '../utils';
import { useFindExceptionListReferences } from '../../../logic/use_find_references';
import type { ExceptionListRuleReferencesSchema } from '../../../../../../common/detection_engine/rule_exceptions';

interface ExceptionsAddToListsComponentProps {
  /**
   * Normally if there's no sharedExceptionLists, this opition is disabled, however,
   * when adding an exception item from the exception lists management page, there is no
   * list or rule to go off of, so user can select to add the exception to any rule or to any
   * shared list.
   */
  showAllSharedLists: boolean;
  /* Shared exception lists to display as options to add item to */
  sharedExceptionLists: ListArray;
  onListSelectionChange?: (listsSelectedToAdd: ExceptionListSchema[]) => void;
}

const ExceptionsAddToListsComponent: React.FC<ExceptionsAddToListsComponentProps> = ({
  showAllSharedLists,
  sharedExceptionLists,
  onListSelectionChange,
}): JSX.Element => {
  const listsToFetch = useMemo(() => {
    return showAllSharedLists ? [] : sharedExceptionLists;
  }, [showAllSharedLists, sharedExceptionLists]);
  const [listsToDisplay, setListsToDisplay] = useState<ExceptionListRuleReferencesSchema[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0 });
  const [message, setMessage] = useState<JSX.Element | string | undefined>(
    <EuiLoadingContent lines={4} data-test-subj="exceptionItemListsTableLoading" />
  );
  const [error, setError] = useState<string | undefined>(undefined);

  const [isLoadingReferences, referenceFetchError, ruleReferences, fetchReferences] =
    useFindExceptionListReferences();

  useEffect(() => {
    if (fetchReferences != null) {
      const listsToQuery: FindRulesReferencedByExceptionsListProp[] = !listsToFetch.length
        ? [{ namespaceType: 'single' }, { namespaceType: 'agnostic' }]
        : listsToFetch.map(({ id, list_id: listId, namespace_type: namespaceType }) => ({
            id,
            listId,
            namespaceType,
          }));
      fetchReferences(listsToQuery);
    }
  }, [listsToFetch, fetchReferences]);

  useEffect(() => {
    if (referenceFetchError) return setError(i18n.REFERENCES_FETCH_ERROR);
    if (isLoadingReferences) {
      return setMessage(
        <EuiLoadingContent lines={4} data-test-subj="exceptionItemListsTableLoading" />
      );
    }
    if (!ruleReferences) return;
    const lists: ExceptionListRuleReferencesSchema[] = [];
    for (const [_, value] of Object.entries(ruleReferences))
      if (value.type === ExceptionListTypeEnum.DETECTION) lists.push(value);

    setMessage(undefined);
    setListsToDisplay(lists);
  }, [isLoadingReferences, referenceFetchError, ruleReferences, showAllSharedLists]);

  const selectionValue = {
    onSelectionChange: (selection: ExceptionListRuleReferencesSchema[]) => {
      if (onListSelectionChange != null) {
        onListSelectionChange(
          selection.map(
            ({
              referenced_rules: _,
              namespace_type: namespaceType,
              os_types: osTypes,
              tags,
              ...rest
            }) => ({
              ...rest,
              namespace_type: namespaceType ?? 'single',
              os_types: osTypes ?? [],
              tags: tags ?? [],
            })
          )
        );
      }
    },
    initialSelected: [],
  };

  return (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      <>
        <EuiText size="s">{i18n.ADD_TO_LISTS_DESCRIPTION}</EuiText>
        <EuiSpacer size="s" />
        <EuiSpacer size="s" />
        <EuiInMemoryTable<ExceptionListRuleReferencesSchema>
          tableCaption="Table of exception lists"
          itemId="id"
          items={listsToDisplay}
          loading={message != null}
          message={message}
          columns={getSharedListsTableColumns()}
          error={error}
          pagination={{
            ...pagination,
            pageSizeOptions: [5],
            showPerPageOptions: false,
          }}
          onTableChange={({ page: { index } }: CriteriaWithPagination<never>) =>
            setPagination({ pageIndex: index })
          }
          selection={selectionValue}
          isSelectable
          sorting
          data-test-subj="addExceptionToSharedListsTable"
        />
      </>
    </EuiPanel>
  );
};

export const ExceptionsAddToListsTable = React.memo(ExceptionsAddToListsComponent);

ExceptionsAddToListsTable.displayName = 'ExceptionsAddToListsTable';
