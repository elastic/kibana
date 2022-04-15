/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiSpacer } from '@elastic/eui';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { RULES_BREADCRUMB_TEXT } from '../rules/translations';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { useKibana } from '../../utils/kibana_react';

interface RuleDetailsPathParams {
  ruleId: string;
}
export function RuleDetailsPage() {
  const { http } = useKibana().services;
  const { ruleId } = useParams<RuleDetailsPathParams>();
  const { ObservabilityPageTemplate } = usePluginContext();
  const { isLoading, rule, error } = useFetchRule({ ruleId });

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
      text: rule && rule.name,
    },
  ]);
  return (
    rule &&
    !error && (
      <ObservabilityPageTemplate
        pageHeader={{
          pageTitle: (
            <>
              {rule.name} <ExperimentalBadge />
              <EuiSpacer size="m" />
              <EuiText color="subdued" size="s">
                <b>Last updated</b> by {rule.updatedBy} on {rule.updatedAt} &emsp;
                <b>Created</b> by {rule.createdBy} on {rule.createdAt}
              </EuiText>
            </>
          ),
        }}
      />
    )
  );
}
