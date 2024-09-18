/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ALERT_START, OBSERVABILITY_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import {
  AlertsTableConfigurationRegistry,
  RenderCustomActionsRowArgs,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { HttpSetup } from '@kbn/core-http-browser';
import { NotificationsStart } from '@kbn/core-notifications-browser';
import { casesFeatureId, observabilityFeatureId } from '../../../../common';
import { AlertActions } from '../../../pages/alerts/components/alert_actions';
import { useGetAlertFlyoutComponents } from '../../alerts_flyout/use_get_alert_flyout_components';
import type { ObservabilityRuleTypeRegistry } from '../../../rules/create_observability_rule_type_registry';
import { ALERTS_PAGE_ALERTS_TABLE_CONFIG_ID } from '../../../constants';
import type { ConfigSchema } from '../../../plugin';
import { getRenderCellValue } from '../common/render_cell_value';
import { getColumns } from '../common/get_columns';
import { getPersistentControlsHook } from './get_persistent_controls';

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
    id: ALERTS_PAGE_ALERTS_TABLE_CONFIG_ID,
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
    usePersistentControls: getPersistentControlsHook({
      groupingId: ALERTS_PAGE_ALERTS_TABLE_CONFIG_ID,
      ruleTypeIds: OBSERVABILITY_RULE_TYPE_IDS,
      services: {
        dataViews,
        http,
        notifications,
      },
    }),
    showInspectButton: true,
  };
};
