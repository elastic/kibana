/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { connect, ConnectedProps, useDispatch } from 'react-redux';
import type {
  AlertStatus,
  SetEventsLoading,
  SetEventsDeleted,
  OnUpdateAlertStatusSuccess,
  OnUpdateAlertStatusError,
} from '../../../../../common/types';
import type { Refetch } from '../../../../store/t_grid/inputs';
import { tGridActions, TGridModel, tGridSelectors, TimelineState } from '../../../../store/t_grid';
import { BulkActions } from './';
import { useStatusBulkActionItems } from '../../../../hooks/use_status_bulk_action_items';

interface OwnProps {
  id: string;
  totalItems: number;
  filterStatus?: AlertStatus;
  query?: string;
  indexName: string;
  onActionSuccess?: OnUpdateAlertStatusSuccess;
  onActionFailure?: OnUpdateAlertStatusError;
  refetch: Refetch;
}

export type StatefulAlertStatusBulkActionsProps = OwnProps & PropsFromRedux;

/**
 * Component to render status bulk actions
 */
export const AlertStatusBulkActionsComponent = React.memo<StatefulAlertStatusBulkActionsProps>(
  ({
    id,
    totalItems,
    filterStatus,
    query,
    selectedEventIds,
    isSelectAllChecked,
    clearSelected,
    indexName,
    onActionSuccess,
    onActionFailure,
    refetch,
  }) => {
    const dispatch = useDispatch();

    const [showClearSelection, setShowClearSelection] = useState(false);

    // Catches state change isSelectAllChecked->false (page checkbox) upon user selection change to reset toolbar select all
    useEffect(() => {
      if (isSelectAllChecked) {
        dispatch(tGridActions.setTGridSelectAll({ id, selectAll: false }));
      } else {
        setShowClearSelection(false);
      }
    }, [dispatch, isSelectAllChecked, id]);

    // Callback for selecting all events on all pages from toolbar
    // Dispatches to stateful_body's selectAll via TimelineTypeContext props
    // as scope of response data required to actually set selectedEvents
    const onSelectAll = useCallback(() => {
      dispatch(tGridActions.setTGridSelectAll({ id, selectAll: true }));
      setShowClearSelection(true);
    }, [dispatch, id]);

    // Callback for clearing entire selection from toolbar
    const onClearSelection = useCallback(() => {
      clearSelected({ id });
      dispatch(tGridActions.setTGridSelectAll({ id, selectAll: false }));
      setShowClearSelection(false);
    }, [clearSelected, dispatch, id]);

    const onUpdateSuccess = useCallback(
      (updated: number, conflicts: number, newStatus: AlertStatus) => {
        refetch();
        if (onActionSuccess) {
          onActionSuccess(updated, conflicts, newStatus);
        }
      },
      [refetch, onActionSuccess]
    );

    const onUpdateFailure = useCallback(
      (newStatus: AlertStatus, error: Error) => {
        refetch();
        if (onActionFailure) {
          onActionFailure(newStatus, error);
        }
      },
      [refetch, onActionFailure]
    );

    const setEventsLoading = useCallback<SetEventsLoading>(
      ({ eventIds, isLoading }) => {
        dispatch(tGridActions.setEventsLoading({ id, eventIds, isLoading }));
      },
      [dispatch, id]
    );

    const setEventsDeleted = useCallback<SetEventsDeleted>(
      ({ eventIds, isDeleted }) => {
        dispatch(tGridActions.setEventsDeleted({ id, eventIds, isDeleted }));
      },
      [dispatch, id]
    );

    const statusBulkActionItems = useStatusBulkActionItems({
      indexName,
      eventIds: Object.keys(selectedEventIds),
      currentStatus: filterStatus,
      ...(showClearSelection ? { query } : {}),
      setEventsLoading,
      setEventsDeleted,
      onUpdateSuccess,
      onUpdateFailure,
      timelineId: id,
    });

    return (
      <BulkActions
        data-test-subj="bulk-actions"
        selectedCount={Object.keys(selectedEventIds).length}
        totalItems={totalItems}
        showClearSelection={showClearSelection}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
        bulkActionItems={statusBulkActionItems}
      />
    );
  }
);

AlertStatusBulkActionsComponent.displayName = 'AlertStatusBulkActionsComponent';

const makeMapStateToProps = () => {
  const getTGrid = tGridSelectors.getTGridByIdSelector();
  const mapStateToProps = (state: TimelineState, { id }: OwnProps) => {
    const timeline: TGridModel = getTGrid(state, id);
    const { selectedEventIds, isSelectAllChecked } = timeline;

    return {
      isSelectAllChecked,
      selectedEventIds,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  clearSelected: tGridActions.clearSelected,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulAlertStatusBulkActions = connector(AlertStatusBulkActionsComponent);

// eslint-disable-next-line import/no-default-export
export { StatefulAlertStatusBulkActions as default };
