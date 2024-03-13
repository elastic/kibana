/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ALERT_START } from '@kbn/rule-data-utils';
import { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  AlertsTableConfigurationRegistry,
  RenderCustomActionsRowArgs,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { RULE_DETAILS_ALERTS_TABLE_CONFIG_ID } from '../../../constants';
import { casesFeatureId, observabilityFeatureId } from '../../../../common';
import { AlertActions } from '../../../pages/alerts/components/alert_actions';
import { useGetAlertFlyoutComponents } from '../../alerts_flyout/use_get_alert_flyout_components';
import type { ObservabilityRuleTypeRegistry } from '../../../rules/create_observability_rule_type_registry';
import type { ConfigSchema } from '../../../plugin';
import { getRenderCellValue } from '../common/render_cell_value';
import { getColumns } from '../common/get_columns';

export const getRuleDetailsTableConfiguration = (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry,
  config: ConfigSchema
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
    id: RULE_DETAILS_ALERTS_TABLE_CONFIG_ID,
    cases: { featureId: casesFeatureId, owner: [observabilityFeatureId] },
    columns: getColumns(),
    getRenderCellValue: ({ setFlyoutAlert }) =>
      getRenderCellValue({
        observabilityRuleTypeRegistry,
        setFlyoutAlert,
      }),
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
  };
};
