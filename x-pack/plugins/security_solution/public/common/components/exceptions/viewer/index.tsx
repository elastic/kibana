/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useEffect, useReducer } from 'react';
import { EuiOverlayMask, EuiModal, EuiModalBody, EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import uuid from 'uuid';

import * as i18n from '../translations';
import { useStateToaster } from '../../toasters';
import { useKibana } from '../../../../common/lib/kibana';
import { Panel } from '../../../../common/components/panel';
import { Loader } from '../../../../common/components/loader';
import { ExceptionsViewerHeader } from './exceptions_viewer_header';
import {
  ExceptionListType,
  ExceptionListItemSchema,
  ApiProps,
  Filter,
  SetExceptionsProps,
} from '../types';
import { allExceptionItemsReducer, State } from './reducer';
import {
  useExceptionList,
  ExceptionIdentifiers,
  useApi,
} from '../../../../../public/lists_plugin_deps';
import { ExceptionsViewerPagination } from './exceptions_pagination';
import { ExceptionsViewerUtility } from './exeptions_utility';
import { ExceptionsViewerItems } from './exceptions_viewer_items';

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
  isModalOpen: false,
};

enum ModalAction {
  CREATE = 'CREATE',
  EDIT = 'EDIT',
}

interface ExceptionsViewerProps {
  ruleId: string;
  exceptionListsMeta: ExceptionIdentifiers[];
  availableListTypes: ExceptionListType[];
  commentsAccordionId: string;
  onAssociateList?: (listId: string) => void;
}

const ExceptionsViewerComponent = ({
  ruleId,
  exceptionListsMeta,
  availableListTypes,
  onAssociateList,
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
  const { deleteExceptionItem } = useApi(services.http);
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
      isModalOpen,
    },
    dispatch,
  ] = useReducer(allExceptionItemsReducer(), { ...initialState, loadingLists: exceptionListsMeta });

  const setExceptions = useCallback(
    ({
      lists: newLists,
      exceptions: newExceptions,
      pagination: newPagination,
    }: SetExceptionsProps) => {
      dispatch({
        type: 'setExceptions',
        lists: newLists,
        exceptions: (newExceptions as unknown) as ExceptionListItemSchema[],
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

  const setIsModalOpen = useCallback(
    (isOpen: boolean): void => {
      dispatch({
        type: 'updateModalOpen',
        isOpen,
      });
    },
    [dispatch]
  );

  const onFetchList = useCallback((): void => {
    if (fetchList != null) {
      fetchList();
    }
  }, [fetchList]);

  const onFiltersChange = useCallback(
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

  const onAddException = useCallback(
    (type: ExceptionListType): void => {
      setIsModalOpen(true);
    },
    [setIsModalOpen]
  );

  const onEditExceptionItem = useCallback(
    (exception: ExceptionListItemSchema): void => {
      // TODO: Added this just for testing. Update
      // modal state logic as needed once ready
      dispatch({
        type: 'updateExceptionToEdit',
        exception,
      });

      setIsModalOpen(true);
    },
    [setIsModalOpen]
  );

  const onCloseExceptionModal = useCallback(
    ({ actionType, listId }): void => {
      setIsModalOpen(false);

      // TODO: This callback along with fetchList can probably get
      // passed to the modal for it to call itself maybe
      if (actionType === ModalAction.CREATE && listId != null && onAssociateList != null) {
        onAssociateList(listId);
      }

      onFetchList();
    },
    [setIsModalOpen, onFetchList, onAssociateList]
  );

  const setLoadingItemIds = useCallback(
    (items: ApiProps[]): void => {
      dispatch({
        type: 'updateLoadingItemIds',
        items,
      });
    },
    [dispatch]
  );

  const onDeleteException = useCallback(
    ({ id, namespaceType }: ApiProps) => {
      deleteExceptionItem({
        id,
        namespaceType,
        onSuccess: () => {
          setLoadingItemIds(loadingItemIds.filter((t) => t.id !== id));
          onFetchList();
        },
        onError: () => {
          const dispatchToasterError = onDispatchToaster({
            color: 'danger',
            title: i18n.DELETE_EXCEPTION_ERROR,
            iconType: 'alert',
          });

          dispatchToasterError();
          setLoadingItemIds(loadingItemIds.filter((t) => t.id !== id));
        },
      });
    },
    [setLoadingItemIds, deleteExceptionItem, loadingItemIds, onFetchList, onDispatchToaster]
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
      `security#/detections/rules/id/${encodeURI(ruleId)}/edit`
    );
  }, [ruleId, services.application]);

  const showEmpty = useMemo((): boolean => {
    return !isInitLoading && !loadingList && exceptions.length === 0;
  }, [isInitLoading, exceptions.length, loadingList]);

  return (
    <>
      {isModalOpen && (
        <EuiOverlayMask>
          <EuiModal onClose={onCloseExceptionModal}>
            <EuiModalBody>
              <EuiCodeBlock language="json" fontSize="m" paddingSize="m" overflowHeight={300}>
                {`Modal goes here`}
              </EuiCodeBlock>
            </EuiModalBody>
          </EuiModal>
        </EuiOverlayMask>
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
          onFilterChange={onFiltersChange}
          onAddExceptionClick={onAddException}
        />

        <EuiSpacer size="l" />

        <ExceptionsViewerUtility
          pagination={pagination}
          filterOptions={filterOptions}
          onRefreshClick={onFetchList}
          ruleSettingsUrl={ruleSettingsUrl}
        />

        <ExceptionsViewerItems
          showEmpty={showEmpty}
          isInitLoading={isInitLoading}
          exceptions={exceptions}
          loadingItemIds={loadingItemIds}
          commentsAccordionId={commentsAccordionId}
          onDeleteException={onDeleteException}
          onEditExceptionItem={onEditExceptionItem}
        />

        <ExceptionsViewerPagination onPaginationChange={onFiltersChange} pagination={pagination} />
      </Panel>
    </>
  );
};

ExceptionsViewerComponent.displayName = 'ExceptionsViewerComponent';

export const ExceptionsViewer = React.memo(ExceptionsViewerComponent);

ExceptionsViewer.displayName = 'ExceptionsViewer';
