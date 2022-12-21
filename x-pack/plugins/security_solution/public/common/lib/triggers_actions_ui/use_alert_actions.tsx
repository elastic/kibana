/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_table/bulk_actions/components/toolbar';
import type { BulkActionsConfig } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useCallback } from 'react';
import { FILTER_CLOSED, FILTER_OPEN, FILTER_ACKNOWLEDGED } from '../../../../common/types';
import { getUpdateAlertsQuery } from '../../components/toolbar/bulk_actions/use_bulk_action_items';
import { useUpdateAlertsStatus } from '../../components/toolbar/bulk_actions/use_update_alerts';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useAppToasts } from '../../hooks/use_app_toasts';
import type { SourcererScopeName } from '../../store/sourcerer/model';
import type { AlertWorkflowStatus } from '../../types';
import { APM_USER_INTERACTIONS } from '../apm/constants';
import { useStartTransaction } from '../apm/use_start_transaction';
import * as i18n from './translations';

interface UseBulkAlertActionItemsArgs {
  scopeId: SourcererScopeName;
}

export const useBulkAlertActionItems = ({ scopeId }: UseBulkAlertActionItemsArgs) => {
  const { startTransaction } = useStartTransaction();

  const { updateAlertStatus } = useUpdateAlertsStatus();
  const { addSuccess, addError, addWarning } = useAppToasts();

  const onAlertStatusUpdateSuccess = useCallback(
    (updated: number, conflicts: number, newStatus: AlertWorkflowStatus) => {
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
          case 'acknowledged':
            title = i18n.ACKNOWLEDGED_ALERT_SUCCESS_TOAST(updated);
        }
        addSuccess({ title });
      }
    },
    [addSuccess, addWarning]
  );

  const onAlertStatusUpdateFailure = useCallback(
    (newStatus: AlertWorkflowStatus, error: Error) => {
      let title: string;
      switch (newStatus) {
        case 'closed':
          title = i18n.CLOSED_ALERT_FAILED_TOAST;
          break;
        case 'open':
          title = i18n.OPENED_ALERT_FAILED_TOAST;
          break;
        case 'acknowledged':
          title = i18n.ACKNOWLEDGED_ALERT_FAILED_TOAST;
      }
      addError(error.message, { title });
    },
    [addError]
  );

  const query = undefined;

  const { selectedPatterns } = useSourcererDataView(scopeId);

  const getOnAction = useCallback(
    (status: AlertWorkflowStatus) => {
      const onActionClick: BulkActionsConfig['onClick'] = async (
        items: TimelineItem[],
        isSelectAllChecked: boolean,
        refresh
      ) => {
        if (query) {
          startTransaction({ name: APM_USER_INTERACTIONS.BULK_QUERY_STATUS_UPDATE });
        } else if (items.length > 1) {
          startTransaction({ name: APM_USER_INTERACTIONS.BULK_STATUS_UPDATE });
        } else {
          startTransaction({ name: APM_USER_INTERACTIONS.STATUS_UPDATE });
        }

        const ids = items.map((item) => item._id);

        try {
          // setEventsLoading({ eventIds, isLoading: true });

          const response = await updateAlertStatus({
            index: selectedPatterns.join(','),
            status,
            query: getUpdateAlertsQuery(ids),
          });

          refresh();

          // TODO: Only delete those that were successfully updated from updatedRules
          // setEventsDeleted({ eventIds, isDeleted: true });

          if (response.version_conflicts && items.length === 1) {
            throw new Error(i18n.BULK_ACTION_FAILED_SINGLE_ALERT);
          }

          onAlertStatusUpdateSuccess(
            response.updated ?? 0,
            response.version_conflicts ?? 0,
            status
          );
        } catch (error) {
          onAlertStatusUpdateFailure(status, error);
        }
      };

      return onActionClick;
    },
    [
      onAlertStatusUpdateFailure,
      onAlertStatusUpdateSuccess,
      updateAlertStatus,
      selectedPatterns,
      query,
      startTransaction,
    ]
  );

  const getUpdateAlertStatusAction = useCallback(
    (status: AlertWorkflowStatus) => {
      const label =
        status === FILTER_OPEN
          ? i18n.BULK_ACTION_OPEN_SELECTED
          : status === FILTER_CLOSED
          ? i18n.BULK_ACTION_CLOSE_SELECTED
          : i18n.BULK_ACTION_ACKNOWLEDGED_SELECTED;

      return {
        label,
        key: 'add-bulk-to-timeline',
        'data-test-subj': `${status}-alert-status`,
        disableOnQuery: false,
        onClick: getOnAction(status),
      };
    },
    [getOnAction]
  );

  return [FILTER_OPEN, FILTER_CLOSED, FILTER_ACKNOWLEDGED].map((status) =>
    getUpdateAlertStatusAction(status as AlertWorkflowStatus)
  );
};
