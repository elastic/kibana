/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../utils/kibana_react';
import { RULES_BREADCRUMB_TEXT } from '../rules/translations';
interface RuleDetailsPathParams {
  ruleId: string;
}
export function RuleDetailsPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const { http } = useKibana().services;

  const { ruleId } = useParams<RuleDetailsPathParams>();
  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
      href: http.basePath.prepend('/app/observability/alerts/'),
    },
    {
      href: http.basePath.prepend('/app/observability/alerts/rules'),
      text: RULES_BREADCRUMB_TEXT,
    },
    {
      text: ruleId, // replace the ruleId with rule name
    },
  ]);

  return <ObservabilityPageTemplate />;
}
