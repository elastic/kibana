/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsTableConfigurationRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { lazy } from 'react';

import { observabilityFeatureId } from '../../common';
import { columns as alertO11yColumns } from '../pages/alerts/containers/alerts_table_t_grid/alerts_table_t_grid';

const AlertsPageFlyoutHeaderLazy = lazy(() =>
  require('../pages/alerts/components/alerts_flyout/alerts_flyout_header')
);
const AlertsPageFlyoutBodyLazy = lazy(() =>
  require('../pages/alerts/components/alerts_flyout/alerts_flyout_body')
);
const AlertsFlyoutFooterLazy = lazy(() =>
  require('../pages/alerts/components/alerts_flyout/alerts_flyout_footer')
);

const registerAlertsTableConfiguration = (registry: AlertsTableConfigurationRegistryContract) => {
  if (registry.has(observabilityFeatureId)) {
    return;
  }
  registry.register({
    id: observabilityFeatureId,
    columns: alertO11yColumns,
    externalFlyout: {
      header: AlertsPageFlyoutHeaderLazy,
      body: AlertsPageFlyoutBodyLazy,
      footer: AlertsFlyoutFooterLazy,
    },
  });
};

export { registerAlertsTableConfiguration };
