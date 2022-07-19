/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetRenderCellValue } from '@kbn/triggers-actions-ui-plugin/public';
import { observabilityFeatureId } from '../../common';
import { TopAlert, useToGetInternalFlyout } from '../pages/alerts';
import { getRenderCellValue } from '../pages/alerts/components/render_cell_value';
import { addDisplayNames } from '../pages/alerts/containers/alerts_table_t_grid/add_display_names';
import { columns as alertO11yColumns } from '../pages/alerts/containers/alerts_table_t_grid/alerts_table_t_grid';
import type { ObservabilityRuleTypeRegistry } from '../rules/create_observability_rule_type_registry';

const getO11yAlertsTableConfiguration = (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry
) => ({
  id: observabilityFeatureId,
  columns: alertO11yColumns.map(addDisplayNames),
  useInternalFlyout: () => {
    const { header, body, footer } = useToGetInternalFlyout(observabilityRuleTypeRegistry);
    return { header, body, footer };
  },
  getRenderCellValue: (({ setFlyoutAlert }: { setFlyoutAlert: (data: TopAlert) => void }) => {
    return getRenderCellValue({ observabilityRuleTypeRegistry, setFlyoutAlert });
  }) as unknown as GetRenderCellValue,
});

export { getO11yAlertsTableConfiguration };
