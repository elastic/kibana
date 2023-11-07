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
import { getRenderCellValue } from './render_cell_value';
import { columns } from './default_columns';
import {
  AlertActions,
  Props as AlertActionsProps,
} from '../../pages/alerts/components/alert_actions';
import { useGetAlertFlyoutComponents } from '../alerts_flyout/use_get_alert_flyout_components';
import type { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';
import type { ConfigSchema } from '../../plugin';
import type { TopAlert } from '../../typings/alerts';

export const getAlertsTableConfiguration = (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry,
  config: ConfigSchema
): AlertsTableConfigurationRegistry => ({
  id: observabilityFeatureId,
  cases: { featureId: casesFeatureId, owner: [observabilityFeatureId] },
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
    renderCustomActionsRow: ({
      alert,
      id,
      setFlyoutAlert,
      refresh,
    }: RenderCustomActionsRowArgs) => {
      return (
        <AlertActions
          config={config}
          data={Object.entries(alert).reduce<AlertActionsProps['data']>(
            (acc, [field, value]) => [...acc, { field, value: value as string[] }],
            []
          )}
          ecsData={{ _id: alert._id, _index: alert._index }}
          id={id}
          observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
          setFlyoutAlert={setFlyoutAlert}
          refresh={refresh}
        />
      );
    },
  }),
  useInternalFlyout: () => {
    const { header, body, footer } = useGetAlertFlyoutComponents(observabilityRuleTypeRegistry);
    return { header, body, footer };
  },
});
