/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useEffect, useReducer } from 'react';
import { EuiSpacer } from '@elastic/eui';
import uuid from 'uuid';

import * as i18n from '../translations';
import { useStateToaster } from '../../toasters';
import { useKibana } from '../../../../common/lib/kibana';
import { Panel } from '../../../../common/components/panel';
import { Loader } from '../../../../common/components/loader';
import { ExceptionsViewerHeader } from './exceptions_viewer_header';
import { ExceptionListItemIdentifiers, Filter } from '../types';
import { allExceptionItemsReducer, State, ViewerModalName } from './reducer';
import {
  useExceptionList,
  ExceptionIdentifiers,
  ExceptionListTypeEnum,
  ExceptionListItemSchema,
  UseExceptionListSuccess,
  useApi,
} from '../../../../../public/lists_plugin_deps';
import { ExceptionsViewerPagination } from './exceptions_pagination';
import { ExceptionsViewerUtility } from './exceptions_utility';
import { ExceptionsViewerItems } from './exceptions_viewer_items';
import { EditExceptionModal } from '../edit_exception_modal';
import { AddExceptionModal } from '../add_exception_modal';

const initialState: State = {
  filterOptions: { filter: '', showEndpointList: false, showDetectionsList: false, tags: [] },
  pagination: {
    pageIndex: 0,
    pageSize: 20,
    totalItemCount: 0,
    pageSizeOptions: [5, 10, 20, 50, 100, 200, 300],
  },
  endpointList: null,
  detectionsList: null,
  allExceptions: [],
  exceptions: [],
  exceptionToEdit: null,
  loadingLists: [],
  loadingItemIds: [],
  isInitLoading: true,
  currentModal: null,
  exceptionListTypeToEdit: null,
};

interface ExceptionsViewerProps {
  ruleId: string;
  ruleName: string;
  exceptionListsMeta: ExceptionIdentifiers[];
  availableListTypes: ExceptionListTypeEnum[];
  commentsAccordionId: string;
}

const ExceptionsViewerComponent = ({
  ruleId,
  ruleName,
  exceptionListsMeta,
  availableListTypes,
  commentsAccordionId,
}: ExceptionsViewerProps): JSX.Element => {
  const { services } = useKibana();
  const [, dispatchToaster] = useStateToaster();
  const onDispatchToaster = useCallback(
    ({ title, color, iconType }) => (): void => {
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
      endpointList,
      detectionsList,
      exceptions,
      filterOptions,
      pagination,
      loadingLists,
      loadingItemIds,
      isInitLoading,
      currentModal,
      exceptionToEdit,
      exceptionListTypeToEdit,
    },
    dispatch,
  ] = useReducer(allExceptionItemsReducer(), { ...initialState, loadingLists: exceptionListsMeta });
  const { deleteExceptionItem } = useApi(services.http);

  const setExceptions = useCallback(
    ({
      lists: newLists,
      exceptions: newExceptions,
      pagination: newPagination,
    }: UseExceptionListSuccess) => {
      dispatch({
        type: 'setExceptions',
        lists: newLists,
        exceptions: newExceptions,
        pagination: newPagination,
      });
    },
    [dispatch]
  );
  const [loadingList, , , , fetchList] = useExceptionList({
    http: services.http,
    lists: loadingLists,
    filterOptions,
    pagination: {
      page: pagination.pageIndex + 1,
      perPage: pagination.pageSize,
      total: pagination.totalItemCount,
    },
    onSuccess: setExceptions,
    onError: onDispatchToaster({
      color: 'danger',
      title: i18n.FETCH_LIST_ERROR,
      iconType: 'alert',
    }),
  });

  const setCurrentModal = useCallback(
    (modalName: ViewerModalName): void => {
      dispatch({
        type: 'updateModalOpen',
        modalName,
      });
    },
    [dispatch]
  );

  const handleFetchList = useCallback((): void => {
    if (fetchList != null) {
      fetchList();
    }
  }, [fetchList]);

  const handleFilterChange = useCallback(
    ({ filter, pagination: pag }: Filter): void => {
      dispatch({
        type: 'updateFilterOptions',
        filterOptions: filter,
        pagination: pag,
        allLists: exceptionListsMeta,
      });
    },
    [dispatch, exceptionListsMeta]
  );

  const handleAddException = useCallback(
    (type: ExceptionListTypeEnum): void => {
      dispatch({
        type: 'updateExceptionListTypeToEdit',
        exceptionListType: type,
      });
      setCurrentModal('addModal');
    },
    [setCurrentModal]
  );

  const handleEditException = useCallback(
    (exception: ExceptionListItemSchema): void => {
      // TODO: Added this just for testing. Update
      // modal state logic as needed once ready
      dispatch({
        type: 'updateExceptionToEdit',
        exception,
      });

      setCurrentModal('editModal');
    },
    [setCurrentModal]
  );

  const handleOnCancelExceptionModal = useCallback((): void => {
    setCurrentModal(null);
  }, [setCurrentModal]);

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
      dispatch({
        type: 'updateIsInitLoading',
        loading: false,
      });
    }
  }, [isInitLoading, exceptions, loadingList, dispatch]);

  // Used in utility bar info text
  const ruleSettingsUrl = useMemo((): string => {
    return services.application.getUrlForApp(
      `security/detections/rules/id/${encodeURI(ruleId)}/edit`
    );
  }, [ruleId, services.application]);

  const showEmpty = useMemo((): boolean => {
    return !isInitLoading && !loadingList && exceptions.length === 0;
  }, [isInitLoading, exceptions.length, loadingList]);

  return (
    <>
      {currentModal === 'editModal' &&
        exceptionToEdit !== null &&
        exceptionListTypeToEdit !== null && (
          <EditExceptionModal
            ruleName={ruleName}
            exceptionListType={exceptionListTypeToEdit}
            exceptionItem={exceptionToEdit}
            onCancel={handleOnCancelExceptionModal}
            onConfirm={handleOnConfirmExceptionModal}
          />
        )}

      {currentModal === 'addModal' && exceptionListTypeToEdit != null && (
        <AddExceptionModal
          ruleName={ruleName}
          ruleId={ruleId}
          exceptionListType={exceptionListTypeToEdit}
          onCancel={handleOnCancelExceptionModal}
          onConfirm={handleOnConfirmExceptionModal}
        />
      )}

      <Panel loading={isInitLoading || loadingList}>
        {(isInitLoading || loadingList) && (
          <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />
        )}

        <ExceptionsViewerHeader
          isInitLoading={isInitLoading}
          supportedListTypes={availableListTypes}
          detectionsListItems={detectionsList != null ? detectionsList.totalItems : 0}
          endpointListItems={endpointList != null ? endpointList.totalItems : 0}
          onFilterChange={handleFilterChange}
          onAddExceptionClick={handleAddException}
        />

        <EuiSpacer size="l" />

        <ExceptionsViewerUtility
          pagination={pagination}
          filterOptions={filterOptions}
          onRefreshClick={handleFetchList}
          ruleSettingsUrl={ruleSettingsUrl}
        />

        <ExceptionsViewerItems
          showEmpty={showEmpty}
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
