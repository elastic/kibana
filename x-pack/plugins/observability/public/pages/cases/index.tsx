/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { RouteParams } from '../../routes';
import { usePluginContext } from '../../hooks/use_plugin_context';

interface CasesProps {
  routeParams: RouteParams<'/cases'>;
}

export function CasesPage(props: CasesProps) {
  const { ObservabilityPageTemplate } = usePluginContext();
  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: (
          <>
            {i18n.translate('xpack.observability.casesTitle', { defaultMessage: 'Cases' })}{' '}
            <ExperimentalBadge />
          </>
        ),
      }}
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiCallOut
            title={i18n.translate('xpack.observability.casesDisclaimerTitle', {
              defaultMessage: 'Coming soon',
            })}
            color="warning"
            iconType="beaker"
          >
            <p>
              {i18n.translate('xpack.observability.casesDisclaimerText', {
                defaultMessage: 'This is the future home of cases.',
              })}
            </p>
          </EuiCallOut>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
