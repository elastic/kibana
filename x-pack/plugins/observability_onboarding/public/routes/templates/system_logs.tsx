/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { breadcrumbsApp } from '../../application/app';
import { Provider as WizardProvider } from '../../components/app/system_logs';
import { ObservabilityOnboardingHeaderActionMenu } from '../../components/app/header_action_menu';
import { ObservabilityOnboardingPluginContextValue } from '../../plugin';

interface Props {
  children: React.ReactNode;
}

export function SystemLogs({ children }: Props) {
  useBreadcrumbs(
    [
      {
        text: i18n.translate(
          'xpack.observability_onboarding.breadcrumbs.systemLogs',
          { defaultMessage: 'System logs' }
        ),
      },
    ],
    breadcrumbsApp
  );

  const {
    services: { config },
  } = useKibana<ObservabilityOnboardingPluginContextValue>();

  const isServerless = config.serverless.enabled;
  return (
    <WizardProvider>
      <EuiFlexGroup direction="column" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSpacer size="l" />
          <EuiFlexGroup direction="row">
            <EuiFlexItem grow={false}>
              <EuiTitle
                size="l"
                data-test-subj="obltOnboardingSystemLogsFilePageHeader"
              >
                <h1>
                  {i18n.translate(
                    'xpack.observability_onboarding.title.collectSystemLogs',
                    { defaultMessage: 'Install shipper to collect system logs' }
                  )}
                </h1>
              </EuiTitle>
            </EuiFlexItem>
            {isServerless && (
              <EuiFlexItem
                grow={false}
                css={{ position: 'absolute', right: 10 }}
              >
                <ObservabilityOnboardingHeaderActionMenu />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={1} style={{ width: '50%' }}>
          <div
            style={{
              display: 'flex',
              flexFlow: 'column nowrap',
            }}
          >
            {children}
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </WizardProvider>
  );
}
