/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { ApmPluginStartDeps } from '../../../../plugin';
import type { SavedApmCustomDashboard } from '../../../../../common/custom_dashboards';

const dashboardDisabledTooltip = i18n.translate(
  'xpack.apm.serviceDashboards.contextMenu.goToDashboardDisabledTooltip',
  {
    defaultMessage: 'This button is disabled because the dashboard link is not available.',
  }
);

export function GotoDashboard({ currentDashboard }: { currentDashboard: SavedApmCustomDashboard }) {
  const {
    services: { share },
  } = useKibana<ApmPluginStartDeps>();

  const url = share?.url?.locators?.get(DASHBOARD_APP_LOCATOR)?.getRedirectUrl({
    dashboardId: currentDashboard?.dashboardSavedObjectId,
  });

  const button = (
    <EuiButtonEmpty
      data-test-subj="apmGotoDashboardGoToDashboardButton"
      color="text"
      size="s"
      iconType="visGauge"
      isDisabled={!url}
      href={url}
    >
      {i18n.translate('xpack.apm.serviceDashboards.contextMenu.goToDashboard', {
        defaultMessage: 'Go to dashboard',
      })}
    </EuiButtonEmpty>
  );

  if (!url) {
    return (
      <EuiToolTip content={dashboardDisabledTooltip} position="top">
        {button}
      </EuiToolTip>
    );
  }
  return button;
}
