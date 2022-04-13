/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useCallback, useState } from 'react';
import {
  CriteriaWithPagination,
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiLoadingContent,
  EuiProgress,
  EuiSearchBarProps,
  EuiSpacer,
  EuiPageHeader,
  EuiHorizontalRule,
} from '@elastic/eui';

import type { NamespaceType, ExceptionListFilter } from '@kbn/securitysolution-io-ts-list-types';
import { useApi, useExceptionLists } from '@kbn/securitysolution-list-hooks';
import { useAppToasts } from '../../../../../../common/hooks/use_app_toasts';
import { AutoDownload } from '../../../../../../common/components/auto_download/auto_download';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useFormatUrl } from '../../../../../../common/components/link_to';
import { Loader } from '../../../../../../common/components/loader';

import * as i18n from './translations';
import { AllRulesUtilityBar } from '../utility_bar';
import { AllExceptionListsColumns, getAllExceptionListsColumns } from './columns';
import { useAllExceptionLists } from './use_all_exception_lists';
import { ReferenceErrorModal } from '../../../../../components/value_lists_management_modal/reference_error_modal';
import { patchRule } from '../../../../../containers/detection_engine/rules/api';
import { ExceptionsSearchBar } from './exceptions_search_bar';
import { getSearchFilters } from '../helpers';
import { SecurityPageName } from '../../../../../../../common/constants';
import { useUserData } from '../../../../../components/user_info';
import { userHasPermissions } from '../../helpers';
import { useListsConfig } from '../../../../../containers/detection_engine/lists/use_lists_config';
import { ExceptionsTableItem } from './types';
import { MissingPrivilegesCallOut } from '../../../../../components/callouts/missing_privileges_callout';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../../../../../common/endpoint/service/artifacts/constants';

export type Func = () => Promise<void>;

interface ReferenceModalState {
  contentText: string;
  rulesReferences: string[];
  isLoading: boolean;
  listId: string;
  listNamespaceType: NamespaceType;
}

const exceptionReferenceModalInitialState: ReferenceModalState = {
  contentText: '',
  rulesReferences: [],
  isLoading: false,
  listId: '',
  listNamespaceType: 'single',
};

export const ExceptionListsTable = React.memo(() => {
  const { formatUrl } = useFormatUrl(SecurityPageName.rules);
  const [{ loading: userInfoLoading, canUserCRUD, canUserREAD }] = useUserData();
  const hasPermissions = userHasPermissions(canUserCRUD);

  const { loading: listsConfigLoading } = useListsConfig();
  const loading = userInfoLoading || listsConfigLoading;

  const {
    services: { http, notifications, timelines, application },
  } = useKibana();
  const { exportExceptionList, deleteExceptionList } = useApi(http);

  const [showReferenceErrorModal, setShowReferenceErrorModal] = useState(false);
  const [referenceModalState, setReferenceModalState] = useState<ReferenceModalState>(
    exceptionReferenceModalInitialState
  );
  const [filters, setFilters] = useState<ExceptionListFilter | undefined>(undefined);
  const [loadingExceptions, exceptions, pagination, setPagination, refreshExceptions] =
    useExceptionLists({
      errorMessage: i18n.ERROR_EXCEPTION_LISTS,
      filterOptions: filters,
      http,
      namespaceTypes: ['single', 'agnostic'],
      notifications,
      hideLists: ALL_ENDPOINT_ARTIFACT_LIST_IDS,
    });
  const [loadingTableInfo, exceptionListsWithRuleRefs, exceptionsListsRef] = useAllExceptionLists({
    exceptionLists: exceptions ?? [],
  });
  const [initLoading, setInitLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [deletingListIds, setDeletingListIds] = useState<string[]>([]);
  const [exportingListIds, setExportingListIds] = useState<string[]>([]);
  const [exportDownload, setExportDownload] = useState<{ name?: string; blob?: Blob }>({});
  const { navigateToUrl } = application;
  const { addError } = useAppToasts();

  const handleDeleteSuccess = useCallback(
    (listId?: string) => () => {
      notifications.toasts.addSuccess({
        title: i18n.exceptionDeleteSuccessMessage(listId ?? referenceModalState.listId),
      });
    },
    [notifications.toasts, referenceModalState.listId]
  );

  const handleDeleteError = useCallback(
    (err: Error & { body?: { message: string } }): void => {
      addError(err, {
        title: i18n.EXCEPTION_DELETE_ERROR,
      });
    },
    [addError]
  );

  const handleDelete = useCallback(
    ({ id, listId, namespaceType }: { id: string; listId: string; namespaceType: NamespaceType }) =>
      async () => {
        try {
          setDeletingListIds((ids) => [...ids, id]);
          if (refreshExceptions != null) {
            refreshExceptions();
          }

          if (exceptionsListsRef[id] != null && exceptionsListsRef[id].rules.length === 0) {
            await deleteExceptionList({
              id,
              namespaceType,
              onError: handleDeleteError,
              onSuccess: handleDeleteSuccess(listId),
            });

            if (refreshExceptions != null) {
              refreshExceptions();
            }
          } else {
            setReferenceModalState({
              contentText: i18n.referenceErrorMessage(exceptionsListsRef[id].rules.length),
              rulesReferences: exceptionsListsRef[id].rules.map(({ name }) => name),
              isLoading: true,
              listId: id,
              listNamespaceType: namespaceType,
            });
            setShowReferenceErrorModal(true);
          }
          // route to patch rules with associated exception list
        } catch (error) {
          handleDeleteError(error);
        } finally {
          setDeletingListIds((ids) => ids.filter((_id) => _id !== id));
        }
      },
    [
      deleteExceptionList,
      exceptionsListsRef,
      handleDeleteError,
      handleDeleteSuccess,
      refreshExceptions,
    ]
  );

  const handleExportSuccess = useCallback(
    (listId: string) =>
      (blob: Blob): void => {
        setExportDownload({ name: listId, blob });
      },
    []
  );

  const handleExportError = useCallback(
    (err: Error) => {
      addError(err, { title: i18n.EXCEPTION_EXPORT_ERROR });
    },
    [addError]
  );

  const handleExport = useCallback(
    ({ id, listId, namespaceType }: { id: string; listId: string; namespaceType: NamespaceType }) =>
      async () => {
        setExportingListIds((ids) => [...ids, id]);
        await exportExceptionList({
          id,
          listId,
          namespaceType,
          onError: handleExportError,
          onSuccess: handleExportSuccess(listId),
        });
      },
    [exportExceptionList, handleExportError, handleExportSuccess]
  );

  const exceptionsColumns = useMemo((): AllExceptionListsColumns[] => {
    // Defaulting to true to default to the lower privilege first
    const isKibanaReadOnly = (canUserREAD && !canUserCRUD) ?? true;
    return getAllExceptionListsColumns(
      handleExport,
      handleDelete,
      formatUrl,
      navigateToUrl,
      isKibanaReadOnly
    );
  }, [handleExport, handleDelete, formatUrl, navigateToUrl, canUserREAD, canUserCRUD]);

  const handleRefresh = useCallback((): void => {
    if (refreshExceptions != null) {
      setLastUpdated(Date.now());
      refreshExceptions();
    }
  }, [refreshExceptions]);

  useEffect(() => {
    if (initLoading && !loading && !loadingExceptions && !loadingTableInfo) {
      setInitLoading(false);
    }
  }, [initLoading, loading, loadingExceptions, loadingTableInfo]);

  const emptyPrompt = useMemo((): JSX.Element => {
    return (
      <EuiEmptyPrompt
        title={<h3>{i18n.NO_EXCEPTION_LISTS}</h3>}
        titleSize="xs"
        body={i18n.NO_LISTS_BODY}
      />
    );
  }, []);

  const handleSearch = useCallback(
    async ({
      query,
      queryText,
    }: Parameters<NonNullable<EuiSearchBarProps['onChange']>>[0]): Promise<void> => {
      const filterOptions = {
        name: null,
        list_id: null,
        created_by: null,
        type: null,
        tags: null,
      };
      const searchTerms = getSearchFilters({
        defaultSearchTerm: 'name',
        filterOptions,
        query,
        searchValue: queryText,
      });
      setFilters(searchTerms);
    },
    []
  );

  const handleCloseReferenceErrorModal = useCallback((): void => {
    setDeletingListIds([]);
    setShowReferenceErrorModal(false);
    setReferenceModalState({
      contentText: '',
      rulesReferences: [],
      isLoading: false,
      listId: '',
      listNamespaceType: 'single',
    });
  }, []);

  const handleReferenceDelete = useCallback(async (): Promise<void> => {
    const exceptionListId = referenceModalState.listId;
    const exceptionListNamespaceType = referenceModalState.listNamespaceType;
    const relevantRules = exceptionsListsRef[exceptionListId].rules;

    try {
      await Promise.all(
        relevantRules.map((rule) => {
          const abortCtrl = new AbortController();
          const exceptionLists = (rule.exceptions_list ?? []).filter(
            ({ id }) => id !== exceptionListId
          );

          return patchRule({
            ruleProperties: {
              rule_id: rule.rule_id,
              exceptions_list: exceptionLists,
            },
            signal: abortCtrl.signal,
          });
        })
      );

      await deleteExceptionList({
        id: exceptionListId,
        namespaceType: exceptionListNamespaceType,
        onError: handleDeleteError,
        onSuccess: handleDeleteSuccess(),
      });
    } catch (err) {
      handleDeleteError(err);
    } finally {
      setReferenceModalState(exceptionReferenceModalInitialState);
      setDeletingListIds([]);
      setShowReferenceErrorModal(false);
      if (refreshExceptions != null) {
        refreshExceptions();
      }
    }
  }, [
    referenceModalState.listId,
    referenceModalState.listNamespaceType,
    exceptionsListsRef,
    deleteExceptionList,
    handleDeleteError,
    handleDeleteSuccess,
    refreshExceptions,
  ]);

  const paginationMemo = useMemo(
    () => ({
      pageIndex: pagination.page - 1,
      pageSize: pagination.perPage,
      totalItemCount: pagination.total || 0,
      pageSizeOptions: [5, 10, 20, 50, 100, 200, 300],
    }),
    [pagination]
  );

  const handleOnDownload = useCallback(() => {
    setExportDownload({});
  }, []);

  const tableItems = useMemo<ExceptionsTableItem[]>(
    () =>
      (exceptionListsWithRuleRefs ?? []).map((item) => ({
        ...item,
        isDeleting: deletingListIds.includes(item.id),
        isExporting: exportingListIds.includes(item.id),
      })),
    [deletingListIds, exceptionListsWithRuleRefs, exportingListIds]
  );

  const handlePaginationChange = useCallback(
    (criteria: CriteriaWithPagination<ExceptionsTableItem>) => {
      const { index, size } = criteria.page;
      setPagination((currentPagination) => ({
        ...currentPagination,
        perPage: size,
        page: index + 1,
      }));
    },
    [setPagination]
  );

  return (
    <>
      <MissingPrivilegesCallOut />
      <EuiPageHeader
        pageTitle={i18n.ALL_EXCEPTIONS}
        description={
          <p>{timelines.getLastUpdated({ showUpdating: loading, updatedAt: lastUpdated })}</p>
        }
      />
      <EuiHorizontalRule />
      <div data-test-subj="allExceptionListsPanel">
        {loadingTableInfo && (
          <EuiProgress
            data-test-subj="loadingRulesInfoProgress"
            size="xs"
            position="absolute"
            color="accent"
          />
        )}
        {!initLoading && <ExceptionsSearchBar onSearch={handleSearch} />}
        <EuiSpacer size="m" />

        {loadingTableInfo && !initLoading && !showReferenceErrorModal && (
          <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />
        )}

        {initLoading ? (
          <EuiLoadingContent data-test-subj="initialLoadingPanelAllRulesTable" lines={10} />
        ) : (
          <>
            <AllRulesUtilityBar
              hasBulkActions={false}
              canBulkEdit={hasPermissions}
              paginationTotal={exceptionListsWithRuleRefs.length ?? 0}
              numberSelectedItems={0}
              onRefresh={handleRefresh}
            />
            <EuiBasicTable<ExceptionsTableItem>
              data-test-subj="exceptions-table"
              columns={exceptionsColumns}
              isSelectable={hasPermissions}
              itemId="id"
              items={tableItems}
              noItemsMessage={emptyPrompt}
              onChange={handlePaginationChange}
              pagination={paginationMemo}
            />
          </>
        )}

        <AutoDownload
          blob={exportDownload.blob}
          name={`${exportDownload.name}.ndjson`}
          onDownload={handleOnDownload}
        />
        <ReferenceErrorModal
          cancelText={i18n.REFERENCE_MODAL_CANCEL_BUTTON}
          confirmText={i18n.REFERENCE_MODAL_CONFIRM_BUTTON}
          contentText={referenceModalState.contentText}
          onCancel={handleCloseReferenceErrorModal}
          onClose={handleCloseReferenceErrorModal}
          onConfirm={handleReferenceDelete}
          references={referenceModalState.rulesReferences}
          showModal={showReferenceErrorModal}
          titleText={i18n.REFERENCE_MODAL_TITLE}
        />
      </div>
    </>
  );
});

ExceptionListsTable.displayName = 'ExceptionListsTable';
