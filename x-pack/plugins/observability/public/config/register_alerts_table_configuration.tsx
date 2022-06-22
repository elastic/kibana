/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertsTableConfigurationRegistryContract,
  AlertTableFlyoutComponent,
  GetRenderCellValue,
} from '@kbn/triggers-actions-ui-plugin/public';
import { lazy } from 'react';

import { observabilityFeatureId } from '../../common';
import { getRenderCellValue } from '../pages/alerts/components/render_cell_value';
import { addDisplayNames } from '../pages/alerts/containers/alerts_table_t_grid/add_display_names';
import { columns as alertO11yColumns } from '../pages/alerts/containers/alerts_table_t_grid/alerts_table_t_grid';

const AlertsPageFlyoutHeaderLazy = lazy(
  () => import('../pages/alerts/components/alerts_flyout/alerts_flyout_header')
);
const AlertsPageFlyoutBodyLazy = lazy(
  () => import('../pages/alerts/components/alerts_flyout/alerts_flyout_body')
);
const AlertsFlyoutFooterLazy = lazy(
  () => import('../pages/alerts/components/alerts_flyout/alerts_flyout_footer')
);

const getO11yAlertsTableConfiguration = () => ({
  id: observabilityFeatureId,
  columns: alertO11yColumns.map(addDisplayNames),
  externalFlyout: {
    header: AlertsPageFlyoutHeaderLazy as AlertTableFlyoutComponent,
    body: AlertsPageFlyoutBodyLazy as AlertTableFlyoutComponent,
    footer: AlertsFlyoutFooterLazy as AlertTableFlyoutComponent,
  },
  getRenderCellValue: getRenderCellValue as GetRenderCellValue,
});

export { getO11yAlertsTableConfiguration };
