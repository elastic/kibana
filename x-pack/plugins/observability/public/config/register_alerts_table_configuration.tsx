/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetRenderCellValue } from '@kbn/triggers-actions-ui-plugin/public';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  AlertsTableConfigurationRegistry,
  UseBulkActionsRegistry,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { casesFeatureId, observabilityFeatureId } from '../../common';
import { useBulkAddToCaseActions } from '../hooks/use_alert_bulk_case_actions';
import { TopAlert, useToGetInternalFlyout } from '../pages/alerts';
import { getRenderCellValue } from '../pages/alerts/components/render_cell_value';
import { addDisplayNames } from '../pages/alerts/containers/alerts_table/add_display_names';
import { columns as alertO11yColumns } from '../pages/alerts/containers/alerts_table/default_columns';
import { getRowActions } from '../pages/alerts/containers/alerts_table/get_row_actions';
import type { ObservabilityRuleTypeRegistry } from '../rules/create_observability_rule_type_registry';
import type { ConfigSchema } from '../plugin';

const getO11yAlertsTableConfiguration = (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry,
  config: ConfigSchema
): AlertsTableConfigurationRegistry => ({
  id: observabilityFeatureId,
  casesFeatureId,
  columns: alertO11yColumns.map((col) => {
    return addDisplayNames(col);
  }),
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
  useActionsColumn: getRowActions(observabilityRuleTypeRegistry, config),
  useBulkActions: useBulkAddToCaseActions as UseBulkActionsRegistry,
  useInternalFlyout: () => {
    const { header, body, footer } = useToGetInternalFlyout(observabilityRuleTypeRegistry);
    return { header, body, footer };
  },
});

export { getO11yAlertsTableConfiguration };
