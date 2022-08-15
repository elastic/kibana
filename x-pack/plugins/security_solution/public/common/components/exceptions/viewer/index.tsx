/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import uuid from 'uuid';

import type {
  ExceptionListItemSchema,
  ExceptionListIdentifiers,
  UseExceptionListItemsSuccess,
} from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { useApi, useExceptionListItems } from '@kbn/securitysolution-list-hooks';

import { DEFAULT_INDEX_PATTERN } from '../../../../../common/constants';
import { useStateToaster } from '../../toasters';
import { useUserData } from '../../../../detections/components/user_info';
import { useKibana } from '../../../lib/kibana';
import { Loader } from '../../loader';
import { ExceptionsViewerHeader } from './exceptions_viewer_header';
import type { ExceptionListItemIdentifiers, Filter } from '../types';
import type { State, ViewerFlyoutName } from './reducer';
import { allExceptionItemsReducer } from './reducer';

import { ExceptionsViewerPagination } from './exceptions_pagination';
import { ExceptionsViewerUtility } from './exceptions_utility';
import { ExceptionsViewerItems } from './exceptions_viewer_items';
import { EditExceptionFlyout } from '../edit_exception_flyout';
import { AddExceptionFlyout } from '../add_exception_flyout';
import * as i18n from '../translations';
import { useFindExceptionListReferences } from '../use_find_references';
import type { Rule } from '../../../../detections/containers/detection_engine/rules/types';

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
};

interface ExceptionsViewerProps {
  rule: Rule;
  exceptionListsMeta: ExceptionListIdentifiers[];
  listType: ExceptionListTypeEnum;
  onRuleChange?: () => void;
}

const ExceptionsViewerComponent = ({
  rule,
  exceptionListsMeta,
  listType,
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
    },
    dispatch,
  ] = useReducer(allExceptionItemsReducer(), { ...initialState });
  const { deleteExceptionItem, getExceptionListsItems } = useApi(services.http);
  const [isReadOnly, setReadOnly] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<null | string | number>(null);
  const [isLoadingReferences, allReferences] = useFindExceptionListReferences(
    rule.exceptions_list ?? []
  );

  const [{ canUserCRUD, hasIndexWrite }] = useUserData();

  useEffect((): void => {
    if (!canUserCRUD || !hasIndexWrite) {
      setReadOnly(true);
    } else {
      setReadOnly(false);
    }
  }, [setReadOnly, canUserCRUD, hasIndexWrite]);

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
    showDetectionsListsOnly: listType !== ExceptionListTypeEnum.ENDPOINT,
    showEndpointListsOnly: listType === ExceptionListTypeEnum.ENDPOINT,
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
    if (listType !== ExceptionListTypeEnum.ENDPOINT) {
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
    } else if (listType === ExceptionListTypeEnum.ENDPOINT) {
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
    }
  }, [
    listType,
    getExceptionListsItems,
    exceptionListsMeta,
    setExceptionItemTotals,
    onDispatchToaster,
  ]);

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

  const handleAddException = useCallback((): void => {
    dispatch({
      type: 'updateExceptionListTypeToEdit',
      exceptionListType: listType,
    });
    setCurrentModal('addException');
  }, [listType, setCurrentModal]);

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
    if (
      isInitLoading &&
      !isLoadingReferences &&
      !loadingList &&
      (exceptions.length === 0 || exceptions != null)
    ) {
      handleGetTotals();
      dispatch({
        type: 'updateIsInitLoading',
        loading: false,
      });

      setLastUpdated(Date.now());
    }
  }, [handleGetTotals, isInitLoading, exceptions, loadingList, dispatch, isLoadingReferences]);

  const showEmpty: boolean = !isInitLoading && !loadingList && exceptions.length === 0;

  const showNoResults: boolean =
    exceptions.length === 0 && (totalEndpointItems > 0 || totalDetectionsItems > 0);

  return (
    <>
      {currentModal === 'editException' &&
        exceptionToEdit != null &&
        exceptionListTypeToEdit != null && (
          <EditExceptionFlyout
            ruleName={rule.name}
            ruleId={rule.id}
            ruleIndices={rule.index ?? DEFAULT_INDEX_PATTERN}
            dataViewId={rule.data_view_id}
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
          ruleIndices={rule.index ?? DEFAULT_INDEX_PATTERN}
          dataViewId={rule.data_view_id}
          ruleId={rule.id}
          exceptionListType={exceptionListTypeToEdit}
          onCancel={handleOnCancelExceptionModal}
          onConfirm={handleOnConfirmExceptionModal}
          onRuleChange={onRuleChange}
        />
      )}

      <EuiPanel hasBorder={false} hasShadow={false}>
        {isInitLoading || loadingList || isLoadingReferences ? (
          <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />
        ) : (
          <>
            {!showEmpty && (
              <>
                <ExceptionsViewerHeader
                  isReadOnly={isReadOnly}
                  isInitLoading={isInitLoading}
                  listType={listType}
                  onFilterChange={handleFilterChange}
                  onAddExceptionClick={handleAddException}
                />

                <EuiSpacer size="l" />

                <ExceptionsViewerUtility pagination={pagination} lastUpdated={lastUpdated} />
              </>
            )}

            <ExceptionsViewerItems
              disableActions={isReadOnly}
              showEmpty={showEmpty}
              showNoResults={showNoResults}
              isInitLoading={isInitLoading}
              exceptions={exceptions}
              loadingItemIds={loadingItemIds}
              onDeleteException={handleDeleteException}
              onEditExceptionItem={handleEditException}
              listType={listType}
              onCreateExceptionListItem={handleAddException}
              ruleReferences={allReferences}
            />

            {!showEmpty && (
              <ExceptionsViewerPagination
                onPaginationChange={handleFilterChange}
                pagination={pagination}
              />
            )}
          </>
        )}
      </EuiPanel>
    </>
  );
};

ExceptionsViewerComponent.displayName = 'ExceptionsViewerComponent';

export const ExceptionsViewer = React.memo(ExceptionsViewerComponent);

ExceptionsViewer.displayName = 'ExceptionsViewer';
