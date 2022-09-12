/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useParams } from 'react-router-dom';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useKibana } from '../../utils/kibana_react';
import { ObservabilityAppServices } from '../../application/types';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { paths } from '../../config/paths';
import PageNotFound from '../404';

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

  const handleSnoozeRule = () => {
    navigateToUrl(http.basePath.prepend(paths.observability.ruleDetails(alert.ruleId)));
  };

  useBreadcrumbs([
    {
      href: http.basePath.prepend(paths.observability.alerts),
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
    },
  ]);

  // Redirect to the the 404 page when the user hit the page url directly in the browser while the feature flag is off.
  if (!config.unsafe.alertDetails.enabled) {
    return <PageNotFound />;
  }

  return (
    <ObservabilityPageTemplate
      data-test-subj="alertDetails"
      pageHeader={{
        pageTitle: <PageTitle alert={alert} />,
        rightSideItems: [
          <EuiFlexGroup direction="rowReverse" alignItems="center">
            <EuiFlexItem>
              <HeaderActions
                onAddToExistingCase={handleAddToExistingCase}
                onCreateNewCase={handleCreateNewCase}
                onSnoozeRule={handleSnoozeRule}
              />
            </EuiFlexItem>
          </EuiFlexGroup>,
        ],
        bottomBorder: false,
      }}
    >
      <AlertSummary alert={alert} />
    </ObservabilityPageTemplate>
  );
}
