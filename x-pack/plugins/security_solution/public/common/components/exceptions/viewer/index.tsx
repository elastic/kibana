/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import uuid from 'uuid';

import type {
  ExceptionListTypeEnum,
  ExceptionListItemSchema,
  ExceptionListIdentifiers,
  UseExceptionListItemsSuccess,
} from '@kbn/securitysolution-io-ts-list-types';
import { useApi, useExceptionListItems } from '@kbn/securitysolution-list-hooks';
import * as i18n from '../translations';
import { useStateToaster } from '../../toasters';
import { useUserData } from '../../../../detections/components/user_info';
import { useKibana } from '../../../lib/kibana';
import { Panel } from '../../panel';
import { Loader } from '../../loader';
import { ExceptionsViewerHeader } from './exceptions_viewer_header';
import { ExceptionListItemIdentifiers, Filter } from '../types';
import { allExceptionItemsReducer, State, ViewerFlyoutName } from './reducer';

import { ExceptionsViewerPagination } from './exceptions_pagination';
import { ExceptionsViewerUtility } from './exceptions_utility';
import { ExceptionsViewerItems } from './exceptions_viewer_items';
import { EditExceptionFlyout } from '../edit_exception_flyout';
import { AddExceptionFlyout } from '../add_exception_flyout';

const initialState: State = {
  filterOptions: { filter: '', tags: [] },
  pagination: {
    pageIndex: 0,
    pageSize: 20,
    totalItemCount: 0,
    pageSizeOptions: [5, 10, 20, 50, 100, 200, 300],
  },
  exceptions: [],
  exceptionToEdit: null,
  loadingItemIds: [],
  isInitLoading: true,
  currentModal: null,
  exceptionListTypeToEdit: null,
  totalEndpointItems: 0,
  totalDetectionsItems: 0,
  showEndpointListsOnly: false,
  showDetectionsListsOnly: false,
};

interface ExceptionsViewerProps {
  ruleId: string;
  ruleName: string;
  ruleIndices: string[];
  exceptionListsMeta: ExceptionListIdentifiers[];
  availableListTypes: ExceptionListTypeEnum[];
  commentsAccordionId: string;
  onRuleChange?: () => void;
}

const ExceptionsViewerComponent = ({
  ruleId,
  ruleName,
  ruleIndices,
  exceptionListsMeta,
  availableListTypes,
  commentsAccordionId,
  onRuleChange,
}: ExceptionsViewerProps): JSX.Element => {
  const { services } = useKibana();
  const [, dispatchToaster] = useStateToaster();
  const onDispatchToaster = useCallback(
    ({ title, color, iconType }) =>
      (): void => {
        dispatchToaster({
          type: 'addToaster',
          toast: {
            id: uuid.v4(),
            title,
            color,
            iconType,
          },
        });
      },
    [dispatchToaster]
  );
  const [
    {
      exceptions,
      filterOptions,
      pagination,
      loadingItemIds,
      isInitLoading,
      currentModal,
      exceptionToEdit,
      exceptionListTypeToEdit,
      totalEndpointItems,
      totalDetectionsItems,
      showDetectionsListsOnly,
      showEndpointListsOnly,
    },
    dispatch,
  ] = useReducer(allExceptionItemsReducer(), { ...initialState });
  const { deleteExceptionItem, getExceptionListsItems } = useApi(services.http);
  const [supportedListTypes, setSupportedListTypes] = useState<ExceptionListTypeEnum[]>([]);

  const [{ canUserCRUD, hasIndexWrite }] = useUserData();

  useEffect((): void => {
    if (!canUserCRUD || !hasIndexWrite) {
      setSupportedListTypes([]);
    } else {
      setSupportedListTypes(availableListTypes);
    }
  }, [availableListTypes, canUserCRUD, hasIndexWrite]);

  const setExceptions = useCallback(
    ({
      exceptions: newExceptions,
      pagination: newPagination,
    }: UseExceptionListItemsSuccess): void => {
      dispatch({
        type: 'setExceptions',
        lists: exceptionListsMeta,
        exceptions: newExceptions,
        pagination: newPagination,
      });
    },
    [dispatch, exceptionListsMeta]
  );
  const [loadingList, , , fetchListItems] = useExceptionListItems({
    http: services.http,
    lists: exceptionListsMeta,
    filterOptions:
      filterOptions.filter !== '' || filterOptions.tags.length > 0 ? [filterOptions] : [],
    pagination: {
      page: pagination.pageIndex + 1,
      perPage: pagination.pageSize,
      total: pagination.totalItemCount,
    },
    showDetectionsListsOnly,
    showEndpointListsOnly,
    matchFilters: true,
    onSuccess: setExceptions,
    onError: onDispatchToaster({
      color: 'danger',
      title: i18n.FETCH_LIST_ERROR,
      iconType: 'alert',
    }),
  });

  const setCurrentModal = useCallback(
    (modalName: ViewerFlyoutName): void => {
      dispatch({
        type: 'updateModalOpen',
        modalName,
      });
    },
    [dispatch]
  );

  const setExceptionItemTotals = useCallback(
    (endpointItemTotals: number | null, detectionItemTotals: number | null): void => {
      dispatch({
        type: 'setExceptionItemTotals',
        totalEndpointItems: endpointItemTotals,
        totalDetectionsItems: detectionItemTotals,
      });
    },
    [dispatch]
  );

  const handleGetTotals = useCallback(async (): Promise<void> => {
    await getExceptionListsItems({
      lists: exceptionListsMeta,
      filterOptions: [],
      pagination: {
        page: 0,
        perPage: 1,
        total: 0,
      },
      showDetectionsListsOnly: true,
      showEndpointListsOnly: false,
      onSuccess: ({ pagination: detectionPagination }) => {
        setExceptionItemTotals(null, detectionPagination.total ?? 0);
      },
      onError: () => {
        const dispatchToasterError = onDispatchToaster({
          color: 'danger',
          title: i18n.TOTAL_ITEMS_FETCH_ERROR,
          iconType: 'alert',
        });

        dispatchToasterError();
      },
    });
    await getExceptionListsItems({
      lists: exceptionListsMeta,
      filterOptions: [],
      pagination: {
        page: 0,
        perPage: 1,
        total: 0,
      },
      showDetectionsListsOnly: false,
      showEndpointListsOnly: true,
      onSuccess: ({ pagination: endpointPagination }) => {
        setExceptionItemTotals(endpointPagination.total ?? 0, null);
      },
      onError: () => {
        const dispatchToasterError = onDispatchToaster({
          color: 'danger',
          title: i18n.TOTAL_ITEMS_FETCH_ERROR,
          iconType: 'alert',
        });

        dispatchToasterError();
      },
    });
  }, [setExceptionItemTotals, exceptionListsMeta, getExceptionListsItems, onDispatchToaster]);

  const handleFetchList = useCallback((): void => {
    if (fetchListItems != null) {
      fetchListItems();
      handleGetTotals();
    }
  }, [fetchListItems, handleGetTotals]);

  const handleFilterChange = useCallback(
    (filters: Partial<Filter>): void => {
      dispatch({
        type: 'updateFilterOptions',
        filters,
      });
    },
    [dispatch]
  );

  const handleAddException = useCallback(
    (type: ExceptionListTypeEnum): void => {
      dispatch({
        type: 'updateExceptionListTypeToEdit',
        exceptionListType: type,
      });
      setCurrentModal('addException');
    },
    [setCurrentModal]
  );

  const handleEditException = useCallback(
    (exception: ExceptionListItemSchema): void => {
      dispatch({
        type: 'updateExceptionToEdit',
        lists: exceptionListsMeta,
        exception,
      });

      setCurrentModal('editException');
    },
    [setCurrentModal, exceptionListsMeta]
  );

  const handleOnCancelExceptionModal = useCallback((): void => {
    setCurrentModal(null);
    handleFetchList();
  }, [setCurrentModal, handleFetchList]);

  const handleOnConfirmExceptionModal = useCallback((): void => {
    setCurrentModal(null);
    handleFetchList();
  }, [setCurrentModal, handleFetchList]);

  const setLoadingItemIds = useCallback(
    (items: ExceptionListItemIdentifiers[]): void => {
      dispatch({
        type: 'updateLoadingItemIds',
        items,
      });
    },
    [dispatch]
  );

  const handleDeleteException = useCallback(
    ({ id: itemId, namespaceType }: ExceptionListItemIdentifiers) => {
      setLoadingItemIds([{ id: itemId, namespaceType }]);

      deleteExceptionItem({
        id: itemId,
        namespaceType,
        onSuccess: () => {
          setLoadingItemIds(loadingItemIds.filter(({ id }) => id !== itemId));
          handleFetchList();
        },
        onError: () => {
          const dispatchToasterError = onDispatchToaster({
            color: 'danger',
            title: i18n.DELETE_EXCEPTION_ERROR,
            iconType: 'alert',
          });

          dispatchToasterError();
          setLoadingItemIds(loadingItemIds.filter(({ id }) => id !== itemId));
        },
      });
    },
    [setLoadingItemIds, deleteExceptionItem, loadingItemIds, handleFetchList, onDispatchToaster]
  );

  // Logic for initial render
  useEffect((): void => {
    if (isInitLoading && !loadingList && (exceptions.length === 0 || exceptions != null)) {
      handleGetTotals();
      dispatch({
        type: 'updateIsInitLoading',
        loading: false,
      });
    }
  }, [handleGetTotals, isInitLoading, exceptions, loadingList, dispatch]);

  // Used in utility bar info text
  const ruleSettingsUrl = services.application.getUrlForApp(
    `security/detections/rules/id/${encodeURI(ruleId)}/edit`
  );

  const showEmpty: boolean =
    !isInitLoading && !loadingList && totalEndpointItems === 0 && totalDetectionsItems === 0;

  const showNoResults: boolean =
    exceptions.length === 0 && (totalEndpointItems > 0 || totalDetectionsItems > 0);

  return (
    <>
      {currentModal === 'editException' &&
        exceptionToEdit != null &&
        exceptionListTypeToEdit != null && (
          <EditExceptionFlyout
            ruleName={ruleName}
            ruleId={ruleId}
            ruleIndices={ruleIndices}
            exceptionListType={exceptionListTypeToEdit}
            exceptionItem={exceptionToEdit}
            onCancel={handleOnCancelExceptionModal}
            onConfirm={handleOnConfirmExceptionModal}
            onRuleChange={onRuleChange}
          />
        )}

      {currentModal === 'addException' && exceptionListTypeToEdit != null && (
        <AddExceptionFlyout
          ruleName={ruleName}
          ruleIndices={ruleIndices}
          ruleId={ruleId}
          exceptionListType={exceptionListTypeToEdit}
          onCancel={handleOnCancelExceptionModal}
          onConfirm={handleOnConfirmExceptionModal}
          onRuleChange={onRuleChange}
        />
      )}

      <Panel loading={isInitLoading || loadingList}>
        {(isInitLoading || loadingList) && (
          <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />
        )}

        <ExceptionsViewerHeader
          isInitLoading={isInitLoading}
          supportedListTypes={supportedListTypes}
          detectionsListItems={totalDetectionsItems}
          endpointListItems={totalEndpointItems}
          onFilterChange={handleFilterChange}
          onAddExceptionClick={handleAddException}
        />

        <EuiSpacer size="l" />

        <ExceptionsViewerUtility
          pagination={pagination}
          showEndpointListsOnly={showEndpointListsOnly}
          showDetectionsListsOnly={showDetectionsListsOnly}
          onRefreshClick={handleFetchList}
          ruleSettingsUrl={ruleSettingsUrl}
        />

        <ExceptionsViewerItems
          disableActions={!canUserCRUD || !hasIndexWrite}
          showEmpty={showEmpty}
          showNoResults={showNoResults}
          isInitLoading={isInitLoading}
          exceptions={exceptions}
          loadingItemIds={loadingItemIds}
          commentsAccordionId={commentsAccordionId}
          onDeleteException={handleDeleteException}
          onEditExceptionItem={handleEditException}
        />

        <ExceptionsViewerPagination
          onPaginationChange={handleFilterChange}
          pagination={pagination}
        />
      </Panel>
    </>
  );
};

ExceptionsViewerComponent.displayName = 'ExceptionsViewerComponent';

export const ExceptionsViewer = React.memo(ExceptionsViewerComponent);

ExceptionsViewer.displayName = 'ExceptionsViewer';
