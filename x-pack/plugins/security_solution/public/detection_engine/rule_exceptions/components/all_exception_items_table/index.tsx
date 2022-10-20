/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useEffect, useReducer } from 'react';
import styled from 'styled-components';

import { EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type {
  ExceptionListItemSchema,
  UseExceptionListItemsSuccess,
  Pagination,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { transformInput } from '@kbn/securitysolution-list-hooks';

import {
  deleteExceptionListItemById,
  fetchExceptionListsItemsByListIds,
} from '@kbn/securitysolution-list-api';

import { useUserData } from '../../../../detections/components/user_info';
import { useKibana, useToasts } from '../../../../common/lib/kibana';
import { ExceptionsViewerSearchBar } from './search_bar';
import type { ExceptionListItemIdentifiers } from '../../utils/types';
import type { State, ViewerFlyoutName, ViewerState } from './reducer';
import { allExceptionItemsReducer } from './reducer';

import { ExceptionsViewerPagination } from './pagination';
import { ExceptionsViewerUtility } from './utility_bar';
import { ExceptionsViewerItems } from './all_items';
import { EditExceptionFlyout } from '../edit_exception_flyout';
import { AddExceptionFlyout } from '../add_exception_flyout';
import * as i18n from './translations';
import { useFindExceptionListReferences } from '../../logic/use_find_references';
import type { Rule } from '../../../rule_management/logic/types';

const StyledText = styled(EuiText)`
  font-style: italic;
`;

const STATES_SEARCH_HIDDEN: ViewerState[] = ['error', 'empty'];
const STATES_PAGINATION_UTILITY_HIDDEN: ViewerState[] = [
  'loading',
  'empty_search',
  'empty',
  'error',
  'searching',
];

const initialState: State = {
  pagination: {
    pageIndex: 0,
    pageSize: 25,
    totalItemCount: 0,
    pageSizeOptions: [5, 10, 25, 50, 100, 200, 300],
  },
  exceptions: [],
  exceptionToEdit: null,
  currenFlyout: null,
  viewerState: 'loading',
  isReadOnly: true,
  lastUpdated: Date.now(),
};

export interface GetExceptionItemProps {
  pagination?: Partial<Pagination>;
  search?: string;
  filters?: string;
}

interface ExceptionsViewerProps {
  rule: Rule | null;
  listTypes: ExceptionListTypeEnum[];
  /* Used for when displaying exceptions for a rule that has since been deleted, forcing read only view */
  isViewReadOnly: boolean;
  onRuleChange?: () => void;
}

const ExceptionsViewerComponent = ({
  rule,
  listTypes,
  isViewReadOnly,
  onRuleChange,
}: ExceptionsViewerProps): JSX.Element => {
  const { services } = useKibana();
  const toasts = useToasts();
  const [{ canUserCRUD, hasIndexWrite }] = useUserData();
  const exceptionListsToQuery = useMemo(
    () =>
      rule != null && rule.exceptions_list != null
        ? rule.exceptions_list.filter(({ type }) =>
            listTypes.includes(type as ExceptionListTypeEnum)
          )
        : [],
    [listTypes, rule]
  );
  const exceptionListsFormattedForReferenceQuery = useMemo(
    () =>
      exceptionListsToQuery.map(({ id, list_id: listId, namespace_type: namespaceType }) => ({
        id,
        listId,
        namespaceType,
      })),
    [exceptionListsToQuery]
  );
  const isEndpointSpecified = useMemo(
    () => listTypes.length === 1 && listTypes[0] === ExceptionListTypeEnum.ENDPOINT,
    [listTypes]
  );

  // Reducer state
  const [
    { exceptions, pagination, currenFlyout, exceptionToEdit, viewerState, isReadOnly, lastUpdated },
    dispatch,
  ] = useReducer(allExceptionItemsReducer(), {
    ...initialState,
  });

  // Reducer actions
  const setLastUpdated = useCallback(
    (lastUpdate: string | number): void => {
      dispatch({
        type: 'setLastUpdateTime',
        lastUpdate,
      });
    },
    [dispatch]
  );

  const setExceptions = useCallback(
    ({
      exceptions: newExceptions,
      pagination: newPagination,
    }: UseExceptionListItemsSuccess): void => {
      setLastUpdated(Date.now());

      dispatch({
        type: 'setExceptions',
        exceptions: newExceptions,
        pagination: newPagination,
      });
    },
    [dispatch, setLastUpdated]
  );

  const setViewerState = useCallback(
    (state: ViewerState): void => {
      dispatch({
        type: 'setViewerState',
        state,
      });
    },
    [dispatch]
  );

  const setFlyoutType = useCallback(
    (flyoutType: ViewerFlyoutName): void => {
      dispatch({
        type: 'updateFlyoutOpen',
        flyoutType,
      });
    },
    [dispatch]
  );

  const setReadOnly = useCallback(
    (readOnly: boolean): void => {
      dispatch({
        type: 'setIsReadOnly',
        readOnly,
      });
    },
    [dispatch]
  );

  const [isLoadingReferences, isFetchReferencesError, allReferences, fetchReferences] =
    useFindExceptionListReferences();

  useEffect(() => {
    if (fetchReferences != null && exceptionListsFormattedForReferenceQuery.length) {
      fetchReferences(exceptionListsFormattedForReferenceQuery);
    }
  }, [exceptionListsFormattedForReferenceQuery, fetchReferences]);

  useEffect(() => {
    if (isFetchReferencesError) {
      setViewerState('error');
    } else if (viewerState == null && isLoadingReferences) {
      setViewerState('loading');
    } else if (viewerState === 'loading' && !isLoadingReferences) {
      setViewerState(null);
    }
  }, [isLoadingReferences, isFetchReferencesError, setViewerState, viewerState]);

  const handleFetchItems = useCallback(
    async (options?: GetExceptionItemProps) => {
      const abortCtrl = new AbortController();

      const newPagination =
        options?.pagination != null
          ? {
              page: (options.pagination.page ?? 0) + 1,
              perPage: options.pagination.perPage,
            }
          : {
              page: pagination.pageIndex + 1,
              perPage: pagination.pageSize,
            };

      if (exceptionListsToQuery.length === 0) {
        return {
          data: [],
          pageIndex: pagination.pageIndex,
          itemsPerPage: pagination.pageSize,
          total: 0,
        };
      }

      const {
        page: pageIndex,
        per_page: itemsPerPage,
        total,
        data,
      } = await fetchExceptionListsItemsByListIds({
        filter: undefined,
        http: services.http,
        listIds: exceptionListsToQuery.map((list) => list.list_id),
        namespaceTypes: exceptionListsToQuery.map((list) => list.namespace_type),
        search: options?.search,
        pagination: newPagination,
        signal: abortCtrl.signal,
      });

      // Please see `kbn-securitysolution-list-hooks/src/transforms/index.test.ts` doc notes
      // for context around the temporary `id`
      const transformedData = data.map((item) => transformInput(item));

      return {
        data: transformedData,
        pageIndex,
        itemsPerPage,
        total,
      };
    },
    [pagination.pageIndex, pagination.pageSize, exceptionListsToQuery, services.http]
  );

  const handleGetExceptionListItems = useCallback(
    async (options?: GetExceptionItemProps) => {
      try {
        const { pageIndex, itemsPerPage, total, data } = await handleFetchItems(options);
        setViewerState(total > 0 ? null : 'empty');

        setExceptions({
          exceptions: data,
          pagination: {
            page: pageIndex,
            perPage: itemsPerPage,
            total,
          },
        });

        setViewerState(total > 0 ? null : 'empty');
      } catch (e) {
        setViewerState('error');

        toasts.addError(e, {
          title: i18n.EXCEPTION_ERROR_TITLE,
          toastMessage: i18n.EXCEPTION_ERROR_DESCRIPTION,
        });
      }
    },
    [handleFetchItems, setExceptions, setViewerState, toasts]
  );

  const handleSearch = useCallback(
    async (options?: GetExceptionItemProps) => {
      try {
        setViewerState('searching');

        const { pageIndex, itemsPerPage, total, data } = await handleFetchItems(options);

        setViewerState(total > 0 ? null : 'empty_search');

        setExceptions({
          exceptions: data,
          pagination: {
            page: pageIndex,
            perPage: itemsPerPage,
            total,
          },
        });
      } catch (e) {
        toasts.addError(e, {
          title: i18n.EXCEPTION_SEARCH_ERROR_TITLE,
          toastMessage: i18n.EXCEPTION_SEARCH_ERROR_BODY,
        });
      }
    },
    [handleFetchItems, setExceptions, setViewerState, toasts]
  );

  const handleAddException = useCallback((): void => {
    setFlyoutType('addException');
  }, [setFlyoutType]);

  const handleEditException = useCallback(
    (exception: ExceptionListItemSchema): void => {
      dispatch({
        type: 'updateExceptionToEdit',
        exception,
      });
      setFlyoutType('editException');
    },
    [setFlyoutType]
  );

  const handleCancelExceptionItemFlyout = useCallback(
    (didRuleChange: boolean): void => {
      setFlyoutType(null);
      if (didRuleChange && onRuleChange != null) {
        onRuleChange();
      }
    },
    [onRuleChange, setFlyoutType]
  );

  const handleConfirmExceptionFlyout = useCallback(
    (didRuleChange: boolean): void => {
      setFlyoutType(null);
      if (didRuleChange && onRuleChange != null) {
        onRuleChange();
      }
      handleGetExceptionListItems();
    },
    [setFlyoutType, handleGetExceptionListItems, onRuleChange]
  );

  const handleDeleteException = useCallback(
    async ({ id: itemId, name, namespaceType }: ExceptionListItemIdentifiers) => {
      const abortCtrl = new AbortController();

      try {
        setViewerState('deleting');

        await deleteExceptionListItemById({
          http: services.http,
          id: itemId,
          namespaceType,
          signal: abortCtrl.signal,
        });

        toasts.addSuccess({
          title: i18n.EXCEPTION_ITEM_DELETE_TITLE,
          text: i18n.EXCEPTION_ITEM_DELETE_TEXT(name),
        });

        await handleGetExceptionListItems();
      } catch (e) {
        setViewerState('error');

        toasts.addError(e, {
          title: i18n.EXCEPTION_DELETE_ERROR_TITLE,
        });
      }
    },
    [handleGetExceptionListItems, services.http, setViewerState, toasts]
  );

  // User privileges checks
  useEffect((): void => {
    setReadOnly(isViewReadOnly || !canUserCRUD || !hasIndexWrite);
  }, [setReadOnly, isViewReadOnly, canUserCRUD, hasIndexWrite]);

  useEffect(() => {
    if (exceptionListsToQuery.length > 0) {
      handleGetExceptionListItems();
    } else {
      setViewerState('empty');
    }
  }, [exceptionListsToQuery.length, handleGetExceptionListItems, setViewerState]);

  const exceptionToEditList = useMemo(
    (): ExceptionListSchema | null =>
      allReferences != null && exceptionToEdit != null
        ? (allReferences[exceptionToEdit.list_id] as ExceptionListSchema)
        : null,
    [allReferences, exceptionToEdit]
  );

  return (
    <>
      {currenFlyout === 'editException' &&
        exceptionToEditList != null &&
        exceptionToEdit != null &&
        rule != null && (
          <EditExceptionFlyout
            rule={rule}
            list={exceptionToEditList}
            itemToEdit={exceptionToEdit}
            showAlertCloseOptions
            onCancel={handleCancelExceptionItemFlyout}
            onConfirm={handleConfirmExceptionFlyout}
            data-test-subj="editExceptionItemFlyout"
          />
        )}

      {currenFlyout === 'addException' && rule != null && (
        <AddExceptionFlyout
          rules={[rule]}
          isBulkAction={false}
          isEndpointItem={isEndpointSpecified}
          onCancel={handleCancelExceptionItemFlyout}
          onConfirm={handleConfirmExceptionFlyout}
          data-test-subj="addExceptionItemFlyout"
          showAlertCloseOptions
        />
      )}

      <EuiPanel hasBorder={false} hasShadow={false}>
        <>
          <StyledText size="s">
            {isEndpointSpecified ? i18n.ENDPOINT_EXCEPTIONS_TAB_ABOUT : i18n.EXCEPTIONS_TAB_ABOUT}
          </StyledText>
          <EuiSpacer size="l" />
          {!STATES_SEARCH_HIDDEN.includes(viewerState) && (
            <ExceptionsViewerSearchBar
              canAddException={isReadOnly}
              isEndpoint={isEndpointSpecified}
              isSearching={viewerState === 'searching'}
              onSearch={handleSearch}
              onAddExceptionClick={handleAddException}
            />
          )}
          {!STATES_PAGINATION_UTILITY_HIDDEN.includes(viewerState) && (
            <>
              <EuiSpacer size="l" />

              <ExceptionsViewerUtility pagination={pagination} lastUpdated={lastUpdated} />
            </>
          )}

          <ExceptionsViewerItems
            isReadOnly={isReadOnly}
            disableActions={isReadOnly || viewerState === 'deleting'}
            exceptions={exceptions}
            isEndpoint={isEndpointSpecified}
            ruleReferences={allReferences}
            viewerState={viewerState}
            onDeleteException={handleDeleteException}
            onEditExceptionItem={handleEditException}
            onCreateExceptionListItem={handleAddException}
          />

          {!STATES_PAGINATION_UTILITY_HIDDEN.includes(viewerState) && (
            <ExceptionsViewerPagination
              onPaginationChange={handleGetExceptionListItems}
              pagination={pagination}
            />
          )}
        </>
      </EuiPanel>
    </>
  );
};

ExceptionsViewerComponent.displayName = 'ExceptionsViewerComponent';

export const ExceptionsViewer = React.memo(ExceptionsViewerComponent);

ExceptionsViewer.displayName = 'ExceptionsViewer';
