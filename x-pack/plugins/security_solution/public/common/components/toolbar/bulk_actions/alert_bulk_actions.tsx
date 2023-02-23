/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import type {
  CustomBulkActionProp,
  SetEventsDeleted,
  SetEventsLoading,
} from '../../../../../common/types';
import { BulkActions } from '.';
import { useBulkActionItems } from './use_bulk_action_items';
import { dataTableActions, dataTableSelectors } from '../../../store/data_table';
import type { DataTableModel } from '../../../store/data_table/model';
import type { AlertWorkflowStatus, Refetch } from '../../../types';
import type { DataTableState } from '../../../store/data_table/types';
import type { OnUpdateAlertStatusError, OnUpdateAlertStatusSuccess } from './types';
import type { inputsModel } from '../../../store';
import { inputsSelectors } from '../../../store';
import { useDeepEqualSelector } from '../../../hooks/use_selector';

interface OwnProps {
  id: string;
  totalItems: number;
  filterStatus?: AlertWorkflowStatus;
  query?: string;
  indexName: string;
  showAlertStatusActions?: boolean;
  onActionSuccess?: OnUpdateAlertStatusSuccess;
  onActionFailure?: OnUpdateAlertStatusError;
  customBulkActions?: CustomBulkActionProp[];
  customRefetch?: Refetch;
}

export type StatefulAlertBulkActionsProps = OwnProps & PropsFromRedux;

/**
 * Component to render status bulk actions
 */
export const AlertBulkActionsComponent = React.memo<StatefulAlertBulkActionsProps>(
  ({
    id,
    totalItems,
    filterStatus,
    query,
    selectedEventIds,
    isSelectAllChecked,
    clearSelected,
    indexName,
    showAlertStatusActions,
    onActionSuccess,
    onActionFailure,
    customBulkActions,
    customRefetch,
  }) => {
    const dispatch = useDispatch();

    const [showClearSelection, setShowClearSelection] = useState(false);
    const getGlobalQuerySelector = inputsSelectors.globalQuery();
    const globalQueries = useDeepEqualSelector(getGlobalQuerySelector);
    const refetchQuery = useCallback(() => {
      globalQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
    }, [globalQueries]);

    // Catches state change isSelectAllChecked->false (page checkbox) upon user selection change to reset toolbar select all
    useEffect(() => {
      if (isSelectAllChecked) {
        dispatch(dataTableActions.setDataTableSelectAll({ id, selectAll: false }));
      } else {
        setShowClearSelection(false);
      }
    }, [dispatch, isSelectAllChecked, id]);

    // Callback for selecting all events on all pages from toolbar
    // Dispatches to stateful_body's selectAll via TimelineTypeContext props
    // as scope of response data required to actually set selectedEvents
    const onSelectAll = useCallback(() => {
      dispatch(dataTableActions.setDataTableSelectAll({ id, selectAll: true }));
      setShowClearSelection(true);
    }, [dispatch, id]);

    // Callback for clearing entire selection from toolbar
    const onClearSelection = useCallback(() => {
      clearSelected({ id });
      dispatch(dataTableActions.setDataTableSelectAll({ id, selectAll: false }));
      setShowClearSelection(false);
    }, [clearSelected, dispatch, id]);

    const onUpdateSuccess = useCallback(
      (updated: number, conflicts: number, newStatus: AlertWorkflowStatus) => {
        if (customRefetch) {
          customRefetch();
        } else {
          refetchQuery();
        }
        if (onActionSuccess) {
          onActionSuccess(updated, conflicts, newStatus);
        }
      },
      [customRefetch, onActionSuccess, refetchQuery]
    );

    const onUpdateFailure = useCallback(
      (newStatus: AlertWorkflowStatus, error: Error) => {
        if (customRefetch) {
          customRefetch();
        } else {
          refetchQuery();
        }
        if (onActionFailure) {
          onActionFailure(newStatus, error);
        }
      },
      [customRefetch, onActionFailure, refetchQuery]
    );

    const setEventsLoading = useCallback<SetEventsLoading>(
      ({ eventIds, isLoading }) => {
        dispatch(dataTableActions.setEventsLoading({ id, eventIds, isLoading }));
      },
      [dispatch, id]
    );

    const setEventsDeleted = useCallback<SetEventsDeleted>(
      ({ eventIds, isDeleted }) => {
        dispatch(dataTableActions.setEventsDeleted({ id, eventIds, isDeleted }));
      },
      [dispatch, id]
    );

    const bulkActionItems = useBulkActionItems({
      indexName,
      eventIds: Object.keys(selectedEventIds),
      currentStatus: filterStatus,
      ...(showClearSelection ? { query } : {}),
      setEventsLoading,
      setEventsDeleted,
      showAlertStatusActions,
      onUpdateSuccess,
      onUpdateFailure,
      customBulkActions,
    });

    return (
      <BulkActions
        data-test-subj="bulk-actions"
        selectedCount={Object.keys(selectedEventIds).length}
        totalItems={totalItems}
        showClearSelection={showClearSelection}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
        bulkActionItems={bulkActionItems}
      />
    );
  }
);

AlertBulkActionsComponent.displayName = 'AlertBulkActionsComponent';

const makeMapStateToProps = () => {
  const getTable = dataTableSelectors.getTableByIdSelector();
  const mapStateToProps = (state: DataTableState, { id }: OwnProps) => {
    const dataTable: DataTableModel = getTable(state, id);
    const { selectedEventIds, isSelectAllChecked } = dataTable;

    return {
      isSelectAllChecked,
      selectedEventIds,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  clearSelected: dataTableActions.clearSelected,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulAlertBulkActions = connector(AlertBulkActionsComponent);

// eslint-disable-next-line import/no-default-export
export { StatefulAlertBulkActions as default };
