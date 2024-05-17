/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { SavedApmCustomDashboard } from '../../../../../common/custom_dashboards';
import { ApmPluginStartDeps } from '../../../../plugin';

export function GotoDashboard({ currentDashboard }: { currentDashboard: SavedApmCustomDashboard }) {
  const {
    services: {
      dashboard: { locator: dashboardLocator },
    },
  } = useKibana<ApmPluginStartDeps>();

  const url = dashboardLocator?.getRedirectUrl({
    dashboardId: currentDashboard?.dashboardSavedObjectId,
  });
  return (
    <EuiButtonEmpty
      data-test-subj="apmGotoDashboardGoToDashboardButton"
      color="text"
      size="s"
      iconType="visGauge"
      href={url}
    >
      {i18n.translate('xpack.apm.serviceDashboards.contextMenu.goToDashboard', {
        defaultMessage: 'Go to dashboard',
      })}
    </EuiButtonEmpty>
  );
}
