/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { EuiSpacer, EuiPanel } from '@elastic/eui';
import uuid from 'uuid';

import type {
  ExceptionListTypeEnum,
  ExceptionListItemSchema,
  ExceptionListIdentifiers,
  UseExceptionListItemsSuccess,
} from '@kbn/securitysolution-io-ts-list-types';
import { useApi, useExceptionListItems, useExceptionLists } from '@kbn/securitysolution-list-hooks';
import * as i18n from '../translations';
import { useStateToaster } from '../../toasters';
import { useUserData } from '../../../../detections/components/user_info';
import { useKibana } from '../../../lib/kibana';
import { Loader } from '../../loader';
import { ExceptionsViewerHeader } from './exceptions_viewer_header';
import { ExceptionListItemIdentifiers, Filter } from '../types';
import { allExceptionItemsReducer, State, ViewerFlyoutName } from './reducer';

import { ExceptionsViewerPagination } from './exceptions_pagination';
import { ExceptionsViewerUtility } from './exceptions_utility';
import { ExceptionItemsViewer } from './exceptions_viewer_items';
import { EditExceptionFlyout } from '../edit_exception_flyout';
import { AddExceptionFlyout } from '../add_exception_flyout';
import { CreateExceptionList } from '../create_exception_list';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../../../common/endpoint/service/artifacts/constants';

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
  totalDetectionsItems: 0,
  showEndpointListsOnly: false,
  showDetectionsListsOnly: false,
};

interface ExceptionsViewerProps {
  rule: Rule;
  ruleIndices: string[];
  dataViewId?: string;
  exceptionListsMeta: ExceptionListIdentifiers[];
  onRuleChange?: () => void;
}

const ExceptionsViewerComponent = ({
  rule,
  ruleIndices,
  dataViewId,
  exceptionListsMeta,
  onRuleChange,
}: ExceptionsViewerProps): JSX.Element => {
  const { services: { http, notifications } } = useKibana();
  const [{ canUserCRUD, hasIndexWrite }] = useUserData();

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
      totalDetectionsItems,
      showDetectionsListsOnly,
      showEndpointListsOnly,
    },
    dispatch,
  ] = useReducer(allExceptionItemsReducer(), { ...initialState });
  const { deleteExceptionItem } = useApi(http);

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
    http: http,
    lists: undefined,
    filters: [],
    pagination: {
      page: pagination.pageIndex + 1,
      perPage: pagination.pageSize,
      total: pagination.totalItemCount,
    },
  });

  // const [loadingExceptions, exceptions, pagination, setPagination, refreshExceptions] =
  //   useExceptionLists({
  //     errorMessage: i18n.EXCEPTION_LISTS_FETCH_ERROR_TOASTER,
  //     filterOptions: filters,
  //     http,
  //     namespaceTypes: ['single', 'agnostic'],
  //     notifications,
  //     hideLists: ALL_ENDPOINT_ARTIFACT_LIST_IDS,
  //   });
  
  // REDUCER ACTION DISPATCHERS
  const setCurrentModal = useCallback(
    (modalName: ViewerFlyoutName): void => {
      dispatch({
        type: 'updateModalOpen',
        modalName,
      });
    },
    [dispatch]
  );

  const setLoadingItemIds = useCallback(
    (items: ExceptionListItemIdentifiers[]): void => {
      dispatch({
        type: 'updateLoadingItemIds',
        items,
      });
    },
    [dispatch]
  );

  const handleFilterChange = useCallback(
    (filters: Partial<Filter>): void => {
      dispatch({
        type: 'updateFilterOptions',
        filters,
      });
    },
    [dispatch]
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

  const refreshExceptionItems = useCallback((): void => {
    if (fetchListItems != null) {
      fetchListItems();
    }
  }, [fetchListItems]);

  const handleAddException = useCallback(
    (): void => {
      setCurrentModal('addException');
    },
    [setCurrentModal]
  );

  const handleOnCancelExceptionModal = useCallback((): void => {
    setCurrentModal(null);
    refreshExceptionItems();
  }, [setCurrentModal, refreshExceptionItems]);

  const handleOnConfirmExceptionModal = useCallback((): void => {
    setCurrentModal(null);
    refreshExceptionItems();
  }, [setCurrentModal, refreshExceptionItems]);

  const handleDeleteException = useCallback(
    ({ id: itemId, namespaceType }: ExceptionListItemIdentifiers) => {
      setLoadingItemIds([{ id: itemId, namespaceType }]);

      deleteExceptionItem({
        id: itemId,
        namespaceType,
        onSuccess: () => {
          setLoadingItemIds(loadingItemIds.filter(({ id }) => id !== itemId));
          refreshExceptionItems();
        },
        onError: () => {
          setLoadingItemIds(loadingItemIds.filter(({ id }) => id !== itemId));
        },
      });
    },
    [setLoadingItemIds, deleteExceptionItem, loadingItemIds, refreshExceptionItems]
  );

  const handleCreateExceptionList = useCallback(
    () => {
      setCurrentModal('createExceptionList');
    },
    [setCurrentModal]
  );

  const handleCloseCreateExceptionListModal = useCallback(
    () => {
      setCurrentModal(null);
    },
    [setCurrentModal]
  );

  const handleCreateExceptionListModalSuccess = useCallback(
    () => {
      handleCloseCreateExceptionListModal();
      setCurrentModal('addException');
    },
    [handleCloseCreateExceptionListModal, setCurrentModal]
  );

  // Logic for initial render
  useEffect((): void => {
    if (isInitLoading && !loadingList && (exceptions.length === 0 || exceptions != null)) {
      dispatch({
        type: 'updateIsInitLoading',
        loading: false,
      });
    }
  }, [isInitLoading, exceptions, loadingList, dispatch]);

  const showEmpty: boolean =
    !isInitLoading && !loadingList && totalDetectionsItems === 0;

  const showNoResults: boolean =
    exceptions.length === 0 && (totalDetectionsItems > 0);

  return (
    <>
      {currentModal === 'editException' &&
        exceptionToEdit != null &&
        exceptionListTypeToEdit != null && (
          <EditExceptionFlyout
            ruleName={rule.name}
            ruleId={rule.rule_id}
            ruleIndices={ruleIndices}
            dataViewId={dataViewId}
            exceptionListType={exceptionListTypeToEdit}
            exceptionItem={exceptionToEdit}
            onCancel={handleOnCancelExceptionModal}
            onConfirm={handleOnConfirmExceptionModal}
            onRuleChange={onRuleChange}
          />
        )}

      {currentModal === 'addException' && exceptionListTypeToEdit != null && (
        <AddExceptionFlyout
          ruleName={rule.name}
          ruleIndices={ruleIndices}
          dataViewId={dataViewId}
          ruleId={rule.rule_id}
          exceptionListType={exceptionListTypeToEdit}
          onCancel={handleOnCancelExceptionModal}
          onConfirm={handleOnConfirmExceptionModal}
          onRuleChange={onRuleChange}
        />
      )}

      {currentModal === 'createExceptionList' && (
        <CreateExceptionList
          rule={rule}
          showFirstLinkedListCallout={showEmpty}
          handleCloseModal={handleCloseCreateExceptionListModal}
          handleCreateExceptionListSuccess={handleCreateExceptionListModalSuccess}
        />
      )}

      <EuiPanel hasBorder={false} hasShadow={false}>
        {(isInitLoading || loadingList) && (
          <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />
        )}
        {!showEmpty && (
          <ExceptionsViewerHeader
            isInitLoading={isInitLoading}
            exceptionListContainers={[]}
            onFilterChange={handleFilterChange}
            onAddExceptionClick={handleAddException}
          />
        )}

        <ExceptionItemsViewer
          disableActions={!canUserCRUD || !hasIndexWrite}
          showEmpty={showEmpty}
          showNoResults={showNoResults}
          isInitLoading={isInitLoading}
          exceptions={exceptions}
          loadingItemIds={loadingItemIds}
          onDeleteException={handleDeleteException}
          onEditExceptionItem={handleEditException}
          onCreateExceptionList={handleCreateExceptionList}
        />

        {!showEmpty && (
          <ExceptionsViewerPagination
            onPaginationChange={handleFilterChange}
            pagination={pagination}
          />
        )}
      </EuiPanel>
    </>
  );
};

ExceptionsViewerComponent.displayName = 'ExceptionsViewerComponent';

export const ExceptionsViewer = React.memo(ExceptionsViewerComponent);

ExceptionsViewer.displayName = 'ExceptionsViewer';