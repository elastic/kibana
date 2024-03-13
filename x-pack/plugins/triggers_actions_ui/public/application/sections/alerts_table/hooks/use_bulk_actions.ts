/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useContext, useEffect } from 'react';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ValidFeatureId } from '@kbn/rule-data-utils';
import { AlertsTableContext } from '../contexts/alerts_table_context';
import {
  Alerts,
  AlertsTableConfigurationRegistry,
  BulkActionsConfig,
  BulkActionsPanelConfig,
  BulkActionsState,
  BulkActionsVerbs,
  UseBulkActionsRegistry,
} from '../../../../types';
import {
  getLeadingControlColumn as getBulkActionsLeadingControlColumn,
  GetLeadingControlColumn,
} from '../bulk_actions/get_leading_control_column';
import { MARK_AS_UNTRACKED } from './translations';
import { TimelineItem } from '../bulk_actions/components/toolbar';
import { useBulkUntrackAlerts } from './use_bulk_untrack_alerts';
import { useBulkUntrackAlertsByQuery } from './use_bulk_untrack_alerts_by_query';

interface BulkActionsProps {
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  alerts: Alerts;
  casesConfig?: AlertsTableConfigurationRegistry['cases'];
  useBulkActionsConfig?: UseBulkActionsRegistry;
  refresh: () => void;
  featureIds?: ValidFeatureId[];
}

export interface UseBulkActions {
  isBulkActionsColumnActive: boolean;
  getBulkActionsLeadingControlColumn: GetLeadingControlColumn;
  bulkActionsState: BulkActionsState;
  bulkActions: BulkActionsPanelConfig[];
  setIsBulkActionsLoading: (isLoading: boolean) => void;
  clearSelection: () => void;
}

type UseBulkUntrackActionsProps = Pick<BulkActionsProps, 'refresh' | 'query' | 'featureIds'> &
  Pick<UseBulkActions, 'clearSelection' | 'setIsBulkActionsLoading'> & {
    isAllSelected: boolean;
  };

const addItemsToInitialPanel = ({
  panels,
  items,
}: {
  panels: BulkActionsPanelConfig[];
  items: BulkActionsConfig[];
}) => {
  if (panels.length > 0) {
    if (panels[0].items) {
      panels[0].items.push(...items);
    }
    return panels;
  } else {
    return [{ id: 0, items }];
  }
};

export const useBulkUntrackActions = ({
  setIsBulkActionsLoading,
  refresh,
  clearSelection,
  query,
  featureIds = [],
  isAllSelected,
}: UseBulkUntrackActionsProps) => {
  const onSuccess = useCallback(() => {
    refresh();
    clearSelection();
  }, [clearSelection, refresh]);

  const { application } = useKibana().services;
  const { mutateAsync: untrackAlerts } = useBulkUntrackAlerts();
  const { mutateAsync: untrackAlertsByQuery } = useBulkUntrackAlertsByQuery();

  // Check if at least one Observability feature is enabled
  if (!application?.capabilities) return [];
  const hasApmPermission = application.capabilities.apm?.['alerting:show'];
  const hasInfrastructurePermission = application.capabilities.infrastructure?.show;
  const hasLogsPermission = application.capabilities.logs?.show;
  const hasUptimePermission = application.capabilities.uptime?.show;
  const hasSloPermission = application.capabilities.slo?.show;
  const hasObservabilityPermission = application.capabilities.observability?.show;

  if (
    !hasApmPermission &&
    !hasInfrastructurePermission &&
    !hasLogsPermission &&
    !hasUptimePermission &&
    !hasSloPermission &&
    !hasObservabilityPermission
  )
    return [];

  return [
    {
      label: MARK_AS_UNTRACKED,
      key: 'mark-as-untracked',
      disableOnQuery: false,
      disabledLabel: MARK_AS_UNTRACKED,
      'data-test-subj': 'mark-as-untracked',
      onClick: async (alerts?: TimelineItem[]) => {
        if (!alerts) return;
        const alertUuids = alerts.map((alert) => alert._id);
        const indices = alerts.map((alert) => alert._index ?? '');
        try {
          setIsBulkActionsLoading(true);
          if (isAllSelected) {
            await untrackAlertsByQuery({ query, featureIds });
          } else {
            await untrackAlerts({ indices, alertUuids });
          }
          onSuccess();
        } finally {
          setIsBulkActionsLoading(false);
        }
      },
    },
  ];
};

export function useBulkActions({
  alerts,
  query,
  refresh,
  useBulkActionsConfig = () => [],
  featureIds,
}: BulkActionsProps): UseBulkActions {
  const {
    bulkActions: [bulkActionsState, updateBulkActionsState],
  } = useContext(AlertsTableContext);
  const configBulkActionPanels = useBulkActionsConfig(query);

  const clearSelection = useCallback(() => {
    updateBulkActionsState({ action: BulkActionsVerbs.clear });
  }, [updateBulkActionsState]);
  const setIsBulkActionsLoading = (isLoading: boolean = true) => {
    updateBulkActionsState({ action: BulkActionsVerbs.updateAllLoadingState, isLoading });
  };
  const untrackBulkActions = useBulkUntrackActions({
    setIsBulkActionsLoading,
    refresh,
    clearSelection,
    query,
    featureIds,
    isAllSelected: bulkActionsState.isAllSelected,
  });

  const initialItems = [
    // SECURITY SOLUTION WORKAROUND: Disable untrack action for SIEM
    ...(featureIds?.includes('siem') ? [] : untrackBulkActions),
  ];

  const bulkActions = initialItems.length
    ? addItemsToInitialPanel({
        panels: configBulkActionPanels,
        items: initialItems,
      })
    : configBulkActionPanels;

  const isBulkActionsColumnActive = bulkActions.length !== 0;

  useEffect(() => {
    updateBulkActionsState({ action: BulkActionsVerbs.rowCountUpdate, rowCount: alerts.length });
  }, [alerts, updateBulkActionsState]);

  return {
    isBulkActionsColumnActive,
    getBulkActionsLeadingControlColumn,
    bulkActionsState,
    bulkActions,
    setIsBulkActionsLoading,
    clearSelection,
  };
}
