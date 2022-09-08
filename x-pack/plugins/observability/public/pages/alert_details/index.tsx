/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { Rule, RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { AlertSummary } from './components';
import { useKibana } from '../../utils/kibana_react';
import { ObservabilityAppServices } from '../../application/types';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { paths } from '../../config/paths';
import PageNotFound from '../404';

// import { useParams } from 'react-router';
// import { AlertDetailsPathParams } from './types';
interface AlertDetailsPageProps {
  rule?: Rule;
}
export function AlertDetailsPage({ rule }: AlertDetailsPageProps) {
  const {
    http,
    triggersActionsUi: { ruleTypeRegistry },
  } = useKibana<ObservabilityAppServices>().services;

  const { ObservabilityPageTemplate, config } = usePluginContext();
  const [ruleTypeModel, setRuleTypeModel] = useState<RuleTypeModel | null>(null);

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
  useEffect(() => {
    // This is hardcoded for test purposes. But we should get that from the alert rule.
    setRuleTypeModel(ruleTypeRegistry.get('metrics.alert.inventory.threshold'));
  }, [ruleTypeRegistry]);

  // Redirect to the the 404 page when the user hit the page url directly in the browser while the feature flag is off.
  if (!config.unsafe.alertDetails.enabled) {
    return <PageNotFound />;
  }
  const AlertContext = ruleTypeModel?.alertDetailsContext;
  return (
    <ObservabilityPageTemplate data-test-subj="alertDetails">
      <AlertSummary alert={alert} />

      <AlertContext specialProps={'From the Alert Details Page'} />
    </ObservabilityPageTemplate>
  );
}
