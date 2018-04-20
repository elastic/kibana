/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'plugins/reporting/directives/export_config';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import { NavBarExtensionsRegistryProvider } from 'ui/registry/navbar_extensions';
import { DashboardConstants } from 'plugins/kibana/dashboard/dashboard_constants';

function dashboardReportProvider(Private, $location, dashboardConfig) {
  const xpackInfo = Private(XPackInfoProvider);
  return {
    appName: 'dashboard',
    key: 'reporting-dashboard',
    label: 'Reporting',
    template: `<export-config object-type="Dashboard" enabled-export-type="printablePdf"></export-config>`,
    description: 'Dashboard Report',
    hideButton: () => (
      dashboardConfig.getHideWriteControls()
      || $location.path() === DashboardConstants.LANDING_PAGE_PATH
      || !xpackInfo.get('features.reporting.printablePdf.showLinks', false)
    ),
    disableButton: () => !xpackInfo.get('features.reporting.printablePdf.enableLinks', false),
    tooltip: () => xpackInfo.get('features.reporting.printablePdf.message'),
    testId: 'topNavReportingLink',
  };
}

NavBarExtensionsRegistryProvider.register(dashboardReportProvider);
