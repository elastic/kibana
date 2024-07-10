/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AlertConsumers, ALERT_START } from '@kbn/rule-data-utils';
import {
  AlertsTableConfigurationRegistry,
  RenderCustomActionsRowArgs,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import { HttpSetup } from '@kbn/core-http-browser';
import { NotificationsStart } from '@kbn/core-notifications-browser';
import { useGetGroupSelectorStateless } from '@kbn/grouping/src/hooks/use_get_group_selector';
import { useAlertDataView } from '@kbn/alerts-ui-shared';
import { type AlertsGroupingProps, useAlertsGroupingState } from '@kbn/alerts-grouping';
import {
  casesFeatureId,
  observabilityAlertFeatureIds,
  observabilityFeatureId,
} from '../../../../common';
import { AlertActions } from '../../../pages/alerts/components/alert_actions';
import { useGetAlertFlyoutComponents } from '../../alerts_flyout/use_get_alert_flyout_components';
import type { ObservabilityRuleTypeRegistry } from '../../../rules/create_observability_rule_type_registry';
import type { ConfigSchema } from '../../../plugin';
import { getRenderCellValue } from '../common/render_cell_value';
import { getColumns } from '../common/get_columns';

interface GetUsePersistentControlsParams {
  groupingId: string;
  featureIds: AlertConsumers[];
  maxGroupingLevels?: number;
  services: Pick<AlertsGroupingProps['services'], 'dataViews' | 'http' | 'notifications'>;
}

export const getDefaultPersistentControls =
  ({
    groupingId,
    featureIds,
    maxGroupingLevels = 3,
    services: { dataViews, http, notifications },
  }: GetUsePersistentControlsParams) =>
  () => {
    const { grouping, updateGrouping } = useAlertsGroupingState(groupingId);

    const onGroupChange = useCallback(
      (selectedGroups: string[]) => {
        updateGrouping({ activeGroups: selectedGroups });
      },
      [updateGrouping]
    );

    const { dataViews: alertDataViews } = useAlertDataView({
      featureIds,
      dataViewsService: dataViews,
      http,
      toasts: notifications.toasts,
    });

    const dataView = useMemo(() => alertDataViews?.[0], [alertDataViews]);

    const groupSelector = useGetGroupSelectorStateless({
      groupingId,
      onGroupChange,
      fields: dataView?.fields ?? [],
      defaultGroupingOptions: grouping.options,
      maxGroupingLevels,
    });

    return useMemo(() => {
      return {
        right: groupSelector,
      };
    }, [groupSelector]);
  };

export const getAlertsPageTableConfiguration = (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry,
  config: ConfigSchema,
  dataViews: DataViewsServicePublic,
  http: HttpSetup,
  notifications: NotificationsStart
): AlertsTableConfigurationRegistry => {
  const renderCustomActionsRow = (props: RenderCustomActionsRowArgs) => {
    return (
      <AlertActions
        {...props}
        config={config}
        observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
      />
    );
  };
  return {
    id: observabilityFeatureId,
    cases: { featureId: casesFeatureId, owner: [observabilityFeatureId] },
    columns: getColumns({ showRuleName: true }),
    getRenderCellValue,
    sort: [
      {
        [ALERT_START]: {
          order: 'desc' as SortOrder,
        },
      },
    ],
    useActionsColumn: () => ({
      renderCustomActionsRow,
    }),
    useInternalFlyout: () => {
      const { header, body, footer } = useGetAlertFlyoutComponents(observabilityRuleTypeRegistry);
      return { header, body, footer };
    },
    ruleTypeIds: observabilityRuleTypeRegistry.list(),
    usePersistentControls: getDefaultPersistentControls({
      groupingId: observabilityFeatureId,
      featureIds: observabilityAlertFeatureIds,
      services: {
        dataViews,
        http,
        notifications,
      },
    }),
    showInspectButton: true,
  };
};
