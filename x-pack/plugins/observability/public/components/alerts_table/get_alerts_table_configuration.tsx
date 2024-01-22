/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  AlertsTableConfigurationRegistry,
  RenderCustomActionsRowArgs,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { casesFeatureId, observabilityFeatureId } from '../../../common';
import { getRenderCellValue } from './render_cell_value';
import { columns } from './default_columns';
import { AlertActions } from '../../pages/alerts/components/alert_actions';
import { useGetAlertFlyoutComponents } from '../alerts_flyout/use_get_alert_flyout_components';
import type { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';
import type { ConfigSchema } from '../../plugin';

export const getAlertsTableConfiguration = (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry,
  config: ConfigSchema
): AlertsTableConfigurationRegistry => ({
  id: observabilityFeatureId,
  cases: { featureId: casesFeatureId, owner: [observabilityFeatureId] },
  columns,
  getRenderCellValue: ({ setFlyoutAlert }) =>
    getRenderCellValue({
      observabilityRuleTypeRegistry,
      setFlyoutAlert,
    }),
  sort: [
    {
      [TIMESTAMP]: {
        order: 'desc' as SortOrder,
      },
    },
  ],
  useActionsColumn: () => ({
    renderCustomActionsRow: (props: RenderCustomActionsRowArgs) => {
      return (
        <AlertActions
          {...props}
          config={config}
          observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
        />
      );
    },
  }),
  useInternalFlyout: () => {
    const { header, body, footer } = useGetAlertFlyoutComponents(observabilityRuleTypeRegistry);
    return { header, body, footer };
  },
  ruleTypeIds: observabilityRuleTypeRegistry.list(),
});
