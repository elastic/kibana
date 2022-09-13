/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import { useKibana } from '../../../utils/kibana_react';
import { ObservabilityAppServices } from '../../../application/types';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { paths } from '../../../config/paths';
import { CenterJustifiedSpinner } from '../../rule_details/components/center_justified_spinner';
import { AlertSummary } from '.';
import PageNotFound from '../../404';

export function AlertDetails() {
  const { http } = useKibana<ObservabilityAppServices>().services;
  const { ObservabilityPageTemplate, config } = usePluginContext();
  const isLoading = false; // To be updated
  const alert: any = {}; // To be updated

  useBreadcrumbs([
    {
      href: http.basePath.prepend(paths.observability.alerts),
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
    },
  ]);

  if (isLoading) {
    return <CenterJustifiedSpinner />;
  }

  if (!isLoading && !alert)
    return (
      <EuiPanel>
        <EuiEmptyPrompt
          iconType="alert"
          color="danger"
          title={
            <h2>
              {i18n.translate('xpack.observability.alertDetails.errorPromptTitle', {
                defaultMessage: 'Unable to load alert details',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.observability.alertDetails.errorPromptBody', {
                defaultMessage: 'There was an error loading the alert details.',
              })}
            </p>
          }
        />
      </EuiPanel>
    );

  // Redirect to the the 404 page when the user hit the page url directly in the browser while the feature flag is off.
  if (!config.unsafe.alertDetails.enabled) {
    return <PageNotFound />;
  }

  return (
    <ObservabilityPageTemplate data-test-subj="alertDetails">
      <AlertSummary alert={alert} />
    </ObservabilityPageTemplate>
  );
}
