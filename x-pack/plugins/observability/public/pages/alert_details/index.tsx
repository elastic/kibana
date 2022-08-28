/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AlertSummary } from './components';
import { useKibana } from '../../utils/kibana_react';
import { ObservabilityAppServices } from '../../application/types';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { paths } from '../../config/paths';
import { ALERTS_BREADCRUMB_TEXT } from '../alerts/translations';

// import { useParams } from 'react-router';
// import { AlertDetailsPathParams } from './types';

export function AlertDetailsPage() {
  const { http } = useKibana<ObservabilityAppServices>().services;

  const { ObservabilityPageTemplate } = usePluginContext();
  // const { alertId } = useParams<AlertDetailsPathParams>();
  const alert = {};

  useBreadcrumbs([
    {
      href: http.basePath.prepend(paths.observability.alerts),
      text: ALERTS_BREADCRUMB_TEXT,
    },
  ]);

  return (
    <ObservabilityPageTemplate data-test-subj="alertDetails">
      <AlertSummary alert={alert} />
    </ObservabilityPageTemplate>
  );
}
