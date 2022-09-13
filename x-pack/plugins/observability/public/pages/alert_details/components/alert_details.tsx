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

function getStaticAlertData() {
  const alert: any = {
    "_index": "",
    "_id": "",
    "kibana.alert.rule.category": "Inventory",
    "kibana.alert.rule.execution.uuid": "b64c05ac-9c41-4dea-a305-37f57706fb47",
    "kibana.alert.rule.name": "CPU Usage",
    "kibana.alert.rule.producer": "infrastructure",
    "kibana.alert.rule.rule_type_id": "metrics.alert.inventory.threshold",
    "kibana.alert.rule.uuid": "bfa42390-3357-11ed-9349-2388d5bf2748",
    "kibana.alert.rule.tags": ["tag1"],
    "@timestamp": "2022-09-13T11:37:48.633Z",
    "kibana.alert.reason": "CPU usage is 10.9% in the last 1 min for Benas-MBP. Alert when > 1%.",
    "kibana.alert.duration.us": 315031000,
    "kibana.alert.instance.id": "Benas-MBP",
    "kibana.alert.start": "2022-09-13T11:32:33.602Z",
    "kibana.alert.uuid": "15f1b46c-6b78-4dca-964a-dcda5d71ad50",
    "kibana.alert.status": "active"
  };

  return {
    isLoading: false,
    alert
  };
}

export function AlertDetails() {
  const { http } = useKibana<ObservabilityAppServices>().services;
  const { ObservabilityPageTemplate, config } = usePluginContext();
  const { isLoading, alert } = getStaticAlertData();

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
