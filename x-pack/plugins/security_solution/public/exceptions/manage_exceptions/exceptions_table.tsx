/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback, useState } from 'react';
import type { EuiSearchBarProps } from '@elastic/eui';

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPagination,
  EuiPopover,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiProgress,
  EuiSpacer,
  EuiPageHeader,
  EuiHorizontalRule,
} from '@elastic/eui';

import type { NamespaceType, ExceptionListFilter } from '@kbn/securitysolution-io-ts-list-types';
import { useApi, useExceptionLists } from '@kbn/securitysolution-list-hooks';

import { AutoDownload } from '../../common/components/auto_download/auto_download';
import { Loader } from '../../common/components/loader';
import { useKibana } from '../../common/lib/kibana';
import { useAppToasts } from '../../common/hooks/use_app_toasts';

import * as i18n from './translations_exceptions_table';
import { ExceptionsTableUtilityBar } from './exceptions_table_utility_bar';
import { useAllExceptionLists } from './use_all_exception_lists';
import { ReferenceErrorModal } from '../../detections/components/value_lists_management_flyout/reference_error_modal';
import { patchRule } from '../../detection_engine/rule_management/api/api';
import { ExceptionsSearchBar } from './exceptions_search_bar';
import { getSearchFilters } from '../../detection_engine/rule_management_ui/components/rules_table/helpers';
import { useUserData } from '../../detections/components/user_info';
import { useListsConfig } from '../../detections/containers/detection_engine/lists/use_lists_config';
import { MissingPrivilegesCallOut } from '../../detections/components/callouts/missing_privileges_callout';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../common/endpoint/service/artifacts/constants';
import { ExceptionsListCard } from './exceptions_list_card';

import { ImportExceptionListFlyout } from './import_exceptions_list_flyout';
import { CreateSharedListFlyout } from './create_shared_exception_list';

import { AddExceptionFlyout } from '../../detection_engine/rule_exceptions/components/add_exception_flyout';

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
  const [{ loading: userInfoLoading, canUserCRUD, canUserREAD }] = useUserData();

  const { loading: listsConfigLoading } = useListsConfig();
  const loading = userInfoLoading || listsConfigLoading;

  const {
    services: { http, notifications, timelines },
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

  const [exportDownload, setExportDownload] = useState<{ name?: string; blob?: Blob }>({});
  const [displayImportListFlyout, setDisplayImportListFlyout] = useState(false);
  const { addError, addSuccess } = useAppToasts();

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
        addSuccess(i18n.EXCEPTION_EXPORT_SUCCESS);
        setExportDownload({ name: listId, blob });
      },
    [addSuccess]
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

  const handleOnDownload = useCallback(() => {
    setExportDownload({});
  }, []);

  const [activePage, setActivePage] = useState(0);
  const [rowSize, setRowSize] = useState(5);
  const [isRowSizePopoverOpen, setIsRowSizePopoverOpen] = useState(false);
  const onRowSizeButtonClick = () => setIsRowSizePopoverOpen((val) => !val);
  const closeRowSizePopover = () => setIsRowSizePopoverOpen(false);

  const rowSizeButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      iconType="arrowDown"
      iconSide="right"
      onClick={onRowSizeButtonClick}
    >
      {`Rows per page: ${rowSize}`}
    </EuiButtonEmpty>
  );

  const getIconType = (size: number) => {
    return size === rowSize ? 'check' : 'empty';
  };

  const rowSizeItems = [
    <EuiContextMenuItem
      key="5 rows"
      icon={getIconType(5)}
      onClick={() => {
        closeRowSizePopover();
        setRowSize(5);
      }}
    >
      {'5 rows'}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="10 rows"
      icon={getIconType(10)}
      onClick={() => {
        closeRowSizePopover();
        setRowSize(10);
      }}
    >
      {'10 rows'}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="25 rows"
      icon={getIconType(25)}
      onClick={() => {
        closeRowSizePopover();
        setRowSize(25);
      }}
    >
      {'25 rows'}
    </EuiContextMenuItem>,
  ];

  useEffect(() => {
    setPagination({
      // off-by-one error
      // we should really update the api to be zero-index based
      // the same way the pagination component in EUI is zero based.
      page: activePage + 1,
      perPage: rowSize,
      total: 0,
    });
  }, [activePage, rowSize, setPagination]);

  const goToPage = (pageNumber: number) => setActivePage(pageNumber);

  const [isCreatePopoverOpen, setIsCreatePopoverOpen] = useState(false);
  const [displayAddExceptionItemFlyout, setDisplayAddExceptionItemFlyout] = useState(false);
  const [displayCreateSharedListFlyout, setDisplayCreateSharedListFlyout] = useState(false);

  const onCreateButtonClick = () => setIsCreatePopoverOpen((isOpen) => !isOpen);
  const onCloseCreatePopover = () => {
    setDisplayAddExceptionItemFlyout(false);
    setIsCreatePopoverOpen(false);
  };

  return (
    <>
      <MissingPrivilegesCallOut />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPageHeader
            pageTitle={i18n.ALL_EXCEPTIONS}
            description={timelines.getLastUpdated({
              showUpdating: loading,
              updatedAt: lastUpdated,
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType={'importAction'} onClick={() => setDisplayImportListFlyout(true)}>
            {i18n.IMPORT_EXCEPTION_LIST_BUTTON}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            data-test-subj="manageExceptionListCreateButton"
            button={
              <EuiButton iconType={'arrowDown'} onClick={onCreateButtonClick}>
                {i18n.CREATE_BUTTON}
              </EuiButton>
            }
            isOpen={isCreatePopoverOpen}
            closePopover={onCloseCreatePopover}
          >
            <EuiContextMenuPanel
              items={[
                <EuiContextMenuItem
                  key={'createList'}
                  onClick={() => {
                    onCloseCreatePopover();
                    setDisplayCreateSharedListFlyout(true);
                  }}
                >
                  {'create shared list'}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key={'createItem'}
                  onClick={() => {
                    onCloseCreatePopover();
                    setDisplayAddExceptionItemFlyout(true);
                  }}
                >
                  {'create exception item'}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>

      {displayCreateSharedListFlyout && (
        <CreateSharedListFlyout handleCloseFlyout={() => setDisplayCreateSharedListFlyout(false)} />
      )}

      {displayAddExceptionItemFlyout && (
        <AddExceptionFlyout
          rules={null}
          isEndpointItem={false}
          isBulkAction={false}
          showAlertCloseOptions
          onCancel={(didRuleChange: boolean) => setDisplayAddExceptionItemFlyout(false)}
          onConfirm={(didRuleChange: boolean) => setDisplayAddExceptionItemFlyout(false)}
        />
      )}

      {displayImportListFlyout && (
        <ImportExceptionListFlyout
          handleRefresh={handleRefresh}
          http={http}
          addSuccess={addSuccess}
          addError={addError}
          setDisplayImportListFlyout={setDisplayImportListFlyout}
        />
      )}

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

        {initLoading || loadingTableInfo ? (
          <EuiLoadingContent data-test-subj="initialLoadingPanelAllRulesTable" lines={10} />
        ) : (
          <>
            <ExceptionsTableUtilityBar
              totalExceptionLists={exceptionListsWithRuleRefs.length}
              onRefresh={handleRefresh}
            />
            <EuiSpacer size="m" />
            {exceptionListsWithRuleRefs.length > 0 && canUserCRUD !== null && canUserREAD !== null && (
              <React.Fragment data-test-subj="exceptionsTable">
                {exceptionListsWithRuleRefs.map((excList) => (
                  <ExceptionsListCard
                    key={excList.list_id}
                    data-test-subj="exceptionsListCard"
                    readOnly={canUserREAD && !canUserCRUD}
                    http={http}
                    exceptionsList={excList}
                    handleDelete={handleDelete}
                    handleExport={handleExport}
                  />
                ))}
              </React.Fragment>
            )}
          </>
        )}
        <EuiFlexGroup>
          <EuiFlexItem style={{ flex: '1 1 auto' }}>
            <EuiFlexGroup alignItems="flexStart">
              <EuiFlexItem>
                <EuiPopover
                  button={rowSizeButton}
                  isOpen={isRowSizePopoverOpen}
                  closePopover={closeRowSizePopover}
                >
                  <EuiContextMenuPanel items={rowSizeItems} />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem style={{ alignItems: 'flex-end' }}>
            <EuiFlexGroup alignItems="flexEnd">
              <EuiFlexItem>
                <EuiPagination
                  aria-label={'Custom pagination example'}
                  pageCount={pagination.total ? Math.ceil(pagination.total / rowSize) : 0}
                  activePage={activePage}
                  onPageClick={goToPage}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

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
