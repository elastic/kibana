/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useEffect, useCallback, useState } from 'react';
import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiLoadingContent,
  EuiProgress,
  EuiFieldSearch,
} from '@elastic/eui';
import styled from 'styled-components';
import { History } from 'history';
import { set } from 'lodash/fp';

import { AutoDownload } from '../../../../../../common/components/auto_download/auto_download';
import { NamespaceType } from '../../../../../../../../lists/common';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useApi, useExceptionLists } from '../../../../../../shared_imports';
import { FormatUrl } from '../../../../../../common/components/link_to';
import { HeaderSection } from '../../../../../../common/components/header_section';
import { Loader } from '../../../../../../common/components/loader';
import { Panel } from '../../../../../../common/components/panel';
import * as i18n from './translations';
import { AllRulesUtilityBar } from '../utility_bar';
import { LastUpdatedAt } from '../../../../../../common/components/last_updated';
import { AllExceptionListsColumns, getAllExceptionListsColumns } from './columns';
import { useAllExceptionLists } from './use_all_exception_lists';
import { ReferenceErrorModal } from '../../../../../components/value_lists_management_modal/reference_error_modal';
import { patchRule } from '../../../../../containers/detection_engine/rules/api';

// Known lost battle with Eui :(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MyEuiBasicTable = styled(EuiBasicTable as any)`` as any;

export type Func = () => void;
export interface ExceptionListFilter {
  name?: string | null;
  list_id?: string | null;
  created_by?: string | null;
}

interface ExceptionListsTableProps {
  history: History;
  hasNoPermissions: boolean;
  loading: boolean;
  formatUrl: FormatUrl;
}

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

export const ExceptionListsTable = React.memo<ExceptionListsTableProps>(
  ({ formatUrl, history, hasNoPermissions, loading }) => {
    const {
      services: { http, notifications },
    } = useKibana();
    const { exportExceptionList, deleteExceptionList } = useApi(http);

    const [showReferenceErrorModal, setShowReferenceErrorModal] = useState(false);
    const [referenceModalState, setReferenceModalState] = useState<ReferenceModalState>(
      exceptionReferenceModalInitialState
    );
    const [filters, setFilters] = useState<ExceptionListFilter>({
      name: null,
      list_id: null,
      created_by: null,
    });
    const [loadingExceptions, exceptions, pagination, refreshExceptions] = useExceptionLists({
      errorMessage: i18n.ERROR_EXCEPTION_LISTS,
      filterOptions: filters,
      http,
      namespaceTypes: ['single', 'agnostic'],
      notifications,
      showTrustedApps: false,
    });
    const [loadingTableInfo, exceptionListsWithRuleRefs, exceptionsListsRef] = useAllExceptionLists(
      {
        exceptionLists: exceptions ?? [],
      }
    );
    const [initLoading, setInitLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(Date.now());
    const [deletingListIds, setDeletingListIds] = useState<string[]>([]);
    const [exportingListIds, setExportingListIds] = useState<string[]>([]);
    const [exportDownload, setExportDownload] = useState<{ name?: string; blob?: Blob }>({});

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
        notifications.toasts.addError(err, {
          title: i18n.EXCEPTION_DELETE_ERROR,
          toastMessage: err.body != null ? err.body.message : err.message,
        });
      },
      [notifications.toasts]
    );

    const handleDelete = useCallback(
      ({
        id,
        listId,
        namespaceType,
      }: {
        id: string;
        listId: string;
        namespaceType: NamespaceType;
      }) => async () => {
        try {
          setDeletingListIds((ids) => [...ids, id]);
          if (refreshExceptions != null) {
            await refreshExceptions();
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
          setDeletingListIds((ids) => [...ids.filter((_id) => _id !== id)]);
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
      (listId: string) => (blob: Blob): void => {
        setExportDownload({ name: listId, blob });
      },
      []
    );

    const handleExportError = useCallback(
      (err: Error) => {
        notifications.toasts.addError(err, { title: i18n.EXCEPTION_EXPORT_ERROR });
      },
      [notifications.toasts]
    );

    const handleExport = useCallback(
      ({
        id,
        listId,
        namespaceType,
      }: {
        id: string;
        listId: string;
        namespaceType: NamespaceType;
      }) => async () => {
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
      return getAllExceptionListsColumns(handleExport, handleDelete, history, formatUrl);
    }, [handleExport, handleDelete, history, formatUrl]);

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

    const handleSearch = useCallback((search: string) => {
      const regex = search.split(/\s+(?=([^"]*"[^"]*")*[^"]*$)/);
      const formattedFilter = regex
        .filter((c) => c != null)
        .reduce<ExceptionListFilter>(
          (filter, term) => {
            const [qualifier, value] = term.split(':');

            if (qualifier == null) {
              filter.name = search;
            } else if (value != null && Object.keys(filter).includes(qualifier)) {
              return set(qualifier, value, filter);
            }

            return filter;
          },
          { name: null, list_id: null, created_by: null }
        );
      setFilters(formattedFilter);
    }, []);

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
        totalItemCount: pagination.total,
        pageSizeOptions: [5, 10, 20, 50, 100, 200, 300],
      }),
      [pagination]
    );

    const handleOnDownload = useCallback(() => {
      setExportDownload({});
    }, []);

    const tableItems = (exceptionListsWithRuleRefs ?? []).map((item) => ({
      ...item,
      isDeleting: deletingListIds.includes(item.id),
      isExporting: exportingListIds.includes(item.id),
    }));

    return (
      <>
        <Panel loading={!initLoading && loadingTableInfo} data-test-subj="allExceptionListsPanel">
          <>
            {loadingTableInfo && (
              <EuiProgress
                data-test-subj="loadingRulesInfoProgress"
                size="xs"
                position="absolute"
                color="accent"
              />
            )}
            <HeaderSection
              split
              title={i18n.ALL_EXCEPTIONS}
              subtitle={<LastUpdatedAt showUpdating={loading} updatedAt={lastUpdated} />}
            >
              <EuiFieldSearch
                data-test-subj="exceptionsHeaderSearch"
                aria-label={i18n.EXCEPTIONS_LISTS_SEARCH_PLACEHOLDER}
                placeholder={i18n.EXCEPTIONS_LISTS_SEARCH_PLACEHOLDER}
                onSearch={handleSearch}
                disabled={initLoading}
                incremental={false}
                fullWidth
              />
            </HeaderSection>

            {loadingTableInfo && !initLoading && !showReferenceErrorModal && (
              <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />
            )}
            {initLoading ? (
              <EuiLoadingContent data-test-subj="initialLoadingPanelAllRulesTable" lines={10} />
            ) : (
              <>
                <AllRulesUtilityBar
                  showBulkActions={false}
                  userHasNoPermissions={hasNoPermissions}
                  paginationTotal={exceptionListsWithRuleRefs.length ?? 0}
                  numberSelectedItems={0}
                  onRefresh={handleRefresh}
                />
                <MyEuiBasicTable
                  data-test-subj="exceptions-table"
                  columns={exceptionsColumns}
                  isSelectable={!hasNoPermissions ?? false}
                  itemId="id"
                  items={tableItems}
                  noItemsMessage={emptyPrompt}
                  onChange={() => {}}
                  pagination={paginationMemo}
                />
              </>
            )}
          </>
        </Panel>
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
      </>
    );
  }
);
