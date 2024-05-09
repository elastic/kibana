/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ALERT_START } from '@kbn/rule-data-utils';
import {
  AlertsTableConfigurationRegistry,
  RenderCustomActionsRowArgs,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { getUsePersistentControls } from '@kbn/alerts-ui-shared/src/grouped_alerts_table/hooks/use_persistent_controls';
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

export const getAlertsPageTableConfiguration = (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry,
  config: ConfigSchema,
  dataViews?,
  http?,
  notifications?
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
    usePersistentControls: getUsePersistentControls({
      groupingId: observabilityFeatureId,
      featureIds: observabilityAlertFeatureIds,
      dataViews,
      http,
      notifications,
    }),
    showInspectButton: true,
  };
};
