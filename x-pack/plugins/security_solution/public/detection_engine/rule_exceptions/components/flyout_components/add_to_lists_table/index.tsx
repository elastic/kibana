/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback, useState } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import { EuiText, EuiSpacer, EuiInMemoryTable, EuiPanel, EuiLoadingContent } from '@elastic/eui';
import type { ExceptionListSchema, ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { fetchExceptionLists } from '@kbn/securitysolution-list-api';

import * as i18n from './translations';
import { useKibana } from '../../../../../common/lib/kibana';
import { getAddToListsTableColumns } from './utils';
import { useFindExceptionListReferences } from '../../../logic/use_find_references';
import type { RuleReferenceSchema } from '../../../../../../common/detection_engine/schemas/response';

interface ExceptionsAddToListsComponentProps {
  sharedExceptionLists: ListArray;
  onListSelectionChange: (listsSelectedToAdd: ExceptionListSchema[]) => void;
}

export interface TableListInterface extends ExceptionListSchema {
  references: RuleReferenceSchema[];
}

const ExceptionsAddToListsComponent: React.FC<ExceptionsAddToListsComponentProps> = ({
  sharedExceptionLists,
  onListSelectionChange,
}): JSX.Element => {
  const { http } = useKibana().services;
  const [listsToDisplay, setListsToDisplay] = useState<TableListInterface[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0 });
  const [message, setMessage] = useState<JSX.Element | string | undefined>(
    <EuiLoadingContent lines={4} data-test-subj="exceptionItemListsTableLoading" />
  );
  const [error, setError] = useState();
  const [isLoadingReferences, ruleReferences] =
    useFindExceptionListReferences(sharedExceptionLists);

  const handleFetchExceptionLists = useCallback(async () => {
    const abortCtrl = new AbortController();

    setMessage(<EuiLoadingContent lines={4} data-test-subj="exceptionItemListsTableLoading" />);

    try {
      const filters = sharedExceptionLists
        .map((list) => `exception-list.attributes.list_id:${list.list_id}`)
        .join(' AND ');

      const { data } = await fetchExceptionLists({
        filters,
        http,
        namespaceTypes: 'single,agnostic',
        pagination: {
          perPage: 10000,
        },
        signal: abortCtrl.signal,
      });
      const transformedData = data.map((list) => ({
        ...list,
        references: ruleReferences != null ? ruleReferences[list.list_id] : [],
      }));

      setMessage(undefined);
      setListsToDisplay(transformedData);
    } catch (e) {
      setError(e);
    }
  }, [sharedExceptionLists, http, ruleReferences]);

  useEffect(() => {
    if (sharedExceptionLists.length && !isLoadingReferences) {
      handleFetchExceptionLists();
    }
  }, [sharedExceptionLists, handleFetchExceptionLists, isLoadingReferences]);

  const selectionValue = {
    onSelectionChange: (selection: TableListInterface[]) => {
      onListSelectionChange(selection.map(({ references, ...rest }) => ({ ...rest })));
    },
    initialSelected: [],
  };

  return (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      <>
        <EuiText size="s">{i18n.ADD_TO_LISTS_DESCRIPTION}</EuiText>
        <EuiSpacer size="s" />
        <EuiSpacer size="s" />
        <EuiInMemoryTable<TableListInterface>
          tableCaption="Table of exception lists"
          itemId="id"
          items={listsToDisplay}
          loading={message != null}
          message={message}
          columns={getAddToListsTableColumns()}
          error={error}
          pagination={{
            ...pagination,
            pageSizeOptions: [5],
            showPerPageOptions: false,
          }}
          onTableChange={({ page: { index } }: CriteriaWithPagination<never>) =>
            setPagination({ pageIndex: index })
          }
          sorting={true}
          selection={selectionValue}
          isSelectable={true}
        />
      </>
    </EuiPanel>
  );
};

export const ExceptionsAddToListsTable = React.memo(ExceptionsAddToListsComponent);

ExceptionsAddToListsTable.displayName = 'ExceptionsAddToListsTable';
