/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { DashboardItemWithTitle } from '../../../../../../common/custom_dashboards';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';

export function GotoDashboard({ currentDashboard }: { currentDashboard: DashboardItemWithTitle }) {
  const {
    services: {
      dashboard: { locator: dashboardLocator },
    },
  } = useKibanaContextForPlugin();

  // TODO Persist filter ?
  const url = dashboardLocator?.getRedirectUrl({
    dashboardId: currentDashboard?.id,
  });
  return (
    <EuiButtonEmpty
      data-test-subj="apmGotoDashboardGoToDashboardButton"
      color="text"
      size="s"
      iconType={'visGauge'}
      href={url}
    >
      {i18n.translate('xpack.infra.customDashboards.contextMenu.goToDashboard', {
        defaultMessage: 'Go to dashboard',
      })}
    </EuiButtonEmpty>
  );
}
