/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { AlertSummary } from './components';
import { useKibana } from '../../utils/kibana_react';
import { ObservabilityAppServices } from '../../application/types';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { paths } from '../../config/paths';

// import { useParams } from 'react-router';
// import { AlertDetailsPathParams } from './types';

export function AlertDetailsPage() {
  const {
    http,
    application: { navigateToUrl },
  } = useKibana<ObservabilityAppServices>().services;

  const { ObservabilityPageTemplate, config } = usePluginContext();
  // const { alertId } = useParams<AlertDetailsPathParams>();
  const alert = {};

  useBreadcrumbs([
    {
      href: http.basePath.prepend(paths.observability.alerts),
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
    },
  ]);

  // Redirect to the Alerts page when the feature flag is off, and the user hit the page url directly in the browser.
  if (!config.unsafe.alertDetail.enabled) {
    navigateToUrl(http.basePath.prepend('/app/observability/alerts'));
  }

  return (
    <ObservabilityPageTemplate data-test-subj="alertDetails">
      <AlertSummary alert={alert} />
    </ObservabilityPageTemplate>
  );
}
