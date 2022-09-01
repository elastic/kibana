/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import type {
  BulkActionsConfig,
  UseBulkActionsRegistry,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import type { TimelineItem } from '../../../../common/search_strategy';
import { FILTER_CLOSED, FILTER_ACKNOWLEDGED, FILTER_OPEN } from '../../../../common/constants';
import { AlertStatus } from '../../../../common/types/timeline/actions';
import { getUpdateAlertsQuery } from '../../../hooks/use_bulk_action_items';
import { STANDALONE_ID } from '../standalone';
import { useTGridComponentState } from '../../../methods/context';
import { useUpdateAlertsStatus } from '../../../container/use_update_alerts';

import * as i18n from '../translations';

export const useBulkActions: UseBulkActionsRegistry = () => {
  const {
    customBulkActions,
    filterStatus,
    filterQuery,
    indexName,
    showAlertStatusActions,
    timelineId,
  } = useTGridComponentState();
  const { updateAlertStatus } = useUpdateAlertsStatus(timelineId !== STANDALONE_ID);

  const onClickUpdateStatus = useCallback(
    async (selectedItems: TimelineItem[], status: AlertStatus) => {
      try {
        // TODO: how to mark individual alerts as loading, and add error/success notifications
        // setEventsLoading({ eventIds, isLoading: true });

        const response = await updateAlertStatus({
          index: indexName,
          status,
          query: filterQuery
            ? JSON.parse(filterQuery)
            : getUpdateAlertsQuery(selectedItems.map(({ _id }) => _id)),
        });

        // TODO: Only delete those that were successfully updated from updatedRules
        // setEventsDeleted({ eventIds, isDeleted: true });

        if (response.version_conflicts && selectedItems.length === 1) {
          throw new Error(i18n.BULK_ACTION_FAILED_SINGLE_ALERT);
        }

        // onAlertStatusUpdateSuccess(response.updated ?? 0, response.version_conflicts ?? 0, status);
      } catch (error) {
        // onAlertStatusUpdateFailure(status, error);
      } finally {
        // setEventsLoading({ eventIds, isLoading: false });
      }
    },
    [updateAlertStatus, indexName, filterQuery]
  );

  const actions = useMemo(() => {
    const _actions: BulkActionsConfig[] = [];

    // Add all alert status-related actions
    if (showAlertStatusActions) {
      if (filterStatus !== FILTER_OPEN) {
        _actions.push({
          key: 'open',
          label: i18n.BULK_ACTION_OPEN_SELECTED,
          disableOnQuery: false,
          'data-test-subj': 'open-alert-status',
          onClick: (selectedItems) => onClickUpdateStatus(selectedItems, FILTER_OPEN),
        });
      }
      if (filterStatus !== FILTER_ACKNOWLEDGED) {
        _actions.push({
          key: 'acknowledge',
          label: i18n.BULK_ACTION_ACKNOWLEDGED_SELECTED,
          disableOnQuery: false,
          'data-test-subj': 'acknowledged-alert-status',
          onClick: (selectedItems) => onClickUpdateStatus(selectedItems, FILTER_ACKNOWLEDGED),
        });
      }
      if (filterStatus !== FILTER_CLOSED) {
        _actions.push({
          key: 'close',
          label: i18n.BULK_ACTION_CLOSE_SELECTED,
          disableOnQuery: false,
          'data-test-subj': 'close-alert-status',
          onClick: (selectedItems) => onClickUpdateStatus(selectedItems, FILTER_CLOSED),
        });
      }
    }

    // Add the custom actions
    if (customBulkActions) {
      for (const action of customBulkActions) {
        const isDisabled = !!(filterQuery && action.disableOnQuery);
        _actions.push({
          key: action.key,
          'data-test-subj': action['data-test-subj'],
          // TODO: How do label and disabledLabel play together?
          // In the tGrid action item type there is a `disabled` prop that helps with that
          disabledLabel: isDisabled && action.disabledLabel ? action.disabledLabel : undefined,
          disableOnQuery: !!action.disableOnQuery,
          label: !isDisabled ? action.label : '',
          onClick: (selectedItems) => action.onClick(selectedItems.map(({ _id }) => _id)),
        });
      }
    }

    return _actions;
  }, [customBulkActions, filterStatus, filterQuery, onClickUpdateStatus, showAlertStatusActions]);

  return actions;
};
