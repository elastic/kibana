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
  OnAlertStatusActionSuccess,
  OnAlertStatusActionFailure,
} from '../../../../../common';
import type { Refetch } from '../../../../store/t_grid/inputs';
import { tGridActions, TGridModel, tGridSelectors, TimelineState } from '../../../../store/t_grid';
import { BulkActions } from './';
import { useAppToasts } from '../../../../hooks/use_app_toasts';
import * as i18n from '../../translations';
import {
  SetEventsDeletedProps,
  SetEventsLoadingProps,
  useStatusBulkActionItems,
} from '../../../../hooks/use_status_bulk_action_items';

interface OwnProps {
  id: string;
  totalItems: number;
  filterStatus?: AlertStatus;
  onActionSuccess?: OnAlertStatusActionSuccess;
  onActionFailure?: OnAlertStatusActionFailure;
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
    selectedEventIds,
    isSelectAllChecked,
    clearSelected,
    onActionSuccess,
    onActionFailure,
    refetch,
  }) => {
    const dispatch = useDispatch();
    const { addSuccess, addError, addWarning } = useAppToasts();

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

    const onAlertStatusUpdateSuccess = useCallback(
      (updated: number, conflicts: number, newStatus: AlertStatus) => {
        if (conflicts > 0) {
          // Partial failure
          addWarning({
            title: i18n.UPDATE_ALERT_STATUS_FAILED(conflicts),
            text: i18n.UPDATE_ALERT_STATUS_FAILED_DETAILED(updated, conflicts),
          });
        } else {
          let title: string;
          switch (newStatus) {
            case 'closed':
              title = i18n.CLOSED_ALERT_SUCCESS_TOAST(updated);
              break;
            case 'open':
              title = i18n.OPENED_ALERT_SUCCESS_TOAST(updated);
              break;
            case 'in-progress':
              title = i18n.IN_PROGRESS_ALERT_SUCCESS_TOAST(updated);
          }
          addSuccess({ title });
        }
        refetch();
        if (onActionSuccess) {
          onActionSuccess(newStatus);
        }
      },
      [addSuccess, addWarning, onActionSuccess, refetch]
    );

    const onAlertStatusUpdateFailure = useCallback(
      (newStatus: AlertStatus, error: Error) => {
        let title: string;
        switch (newStatus) {
          case 'closed':
            title = i18n.CLOSED_ALERT_FAILED_TOAST;
            break;
          case 'open':
            title = i18n.OPENED_ALERT_FAILED_TOAST;
            break;
          case 'in-progress':
            title = i18n.IN_PROGRESS_ALERT_FAILED_TOAST;
        }
        addError(error.message, { title });
        refetch();
        if (onActionFailure) {
          onActionFailure(newStatus, error.message);
        }
      },
      [addError, onActionFailure, refetch]
    );

    const setEventsLoading = useCallback(
      ({ eventIds, isLoading }: SetEventsLoadingProps) => {
        dispatch(tGridActions.setEventsLoading({ id, eventIds, isLoading }));
      },
      [dispatch, id]
    );

    const setEventsDeleted = useCallback(
      ({ eventIds, isDeleted }: SetEventsDeletedProps) => {
        dispatch(tGridActions.setEventsDeleted({ id, eventIds, isDeleted }));
      },
      [dispatch, id]
    );

    const statusBulkActionItems = useStatusBulkActionItems({
      currentStatus: filterStatus,
      eventIds: Object.keys(selectedEventIds),
      setEventsLoading,
      setEventsDeleted,
      onUpdateSuccess: onAlertStatusUpdateSuccess,
      onUpdateFailure: onAlertStatusUpdateFailure,
    });

    return (
      <BulkActions
        data-test-subj="bulk-actions"
        timelineId={id}
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
