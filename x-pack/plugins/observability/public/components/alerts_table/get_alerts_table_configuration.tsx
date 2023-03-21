/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { GetRenderCellValue } from '@kbn/triggers-actions-ui-plugin/public';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  AlertsTableConfigurationRegistry,
  RenderCustomActionsRowArgs,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { casesFeatureId, observabilityFeatureId } from '../../../common';
import { useBulkAddToCaseTriggerActions } from '../../hooks/use_alert_bulk_case_actions';
import { getRenderCellValue } from './render_cell_value';
import { columns } from './default_columns';
import {
  AlertActions,
  Props as AlertActionsProps,
} from '../../routes/pages/alerts/components/alert_actions';
import { useGetAlertFlyoutComponents } from '../use_get_alert_flyout_components';
import type { ObservabilityRuleTypeRegistry } from '../../plugin/rule_registry/create_observability_rule_type_registry';
import type { TopAlert } from '../../typings/alerts';

export const getAlertsTableConfiguration = (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry
): AlertsTableConfigurationRegistry => ({
  id: observabilityFeatureId,
  casesFeatureId,
  columns,
  getRenderCellValue: (({ setFlyoutAlert }: { setFlyoutAlert: (data: TopAlert) => void }) => {
    return getRenderCellValue({ observabilityRuleTypeRegistry, setFlyoutAlert });
  }) as unknown as GetRenderCellValue,
  sort: [
    {
      [TIMESTAMP]: {
        order: 'desc' as SortOrder,
      },
    },
  ],
  useActionsColumn: () => ({
    renderCustomActionsRow: ({ alert, id, setFlyoutAlert }: RenderCustomActionsRowArgs) => {
      return (
        <AlertActions
          data={Object.entries(alert).reduce<AlertActionsProps['data']>(
            (acc, [field, value]) => [...acc, { field, value: value as string[] }],
            []
          )}
          ecsData={{ _id: alert._id, _index: alert._index }}
          id={id}
          observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
          setFlyoutAlert={setFlyoutAlert}
        />
      );
    },
  }),
  useBulkActions: useBulkAddToCaseTriggerActions,
  useInternalFlyout: () => {
    const { header, body, footer } = useGetAlertFlyoutComponents(observabilityRuleTypeRegistry);
    return { header, body, footer };
  },
});
