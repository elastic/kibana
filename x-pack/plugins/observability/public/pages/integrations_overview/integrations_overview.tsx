/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import React, { useEffect, useState } from 'react';
import { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import {
  EuiEmptyPrompt,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
} from '@elastic/eui';
import { Integration } from '../../../common/integrations';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { useKibana } from '../../utils/kibana_react';
import { IntegrationPanel } from './integration_panel';

export function IntegrationsOverviewPage() {
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  const { ObservabilityPageTemplate } = usePluginContext();

  const {
    services: { http, docLinks },
  } = useKibana();

  useBreadcrumbs([
    {
      text: i18n.translate(
        'xpack.observability.integrationsOverviewPage.breadcrumbs.integrationsLinkText',
        {
          defaultMessage: 'Integrations',
        }
      ),
    },
  ]);

  useEffect(() => {
    async function fetchInstalledIntegrations() {
      const response = await http.get<{ integrations: Integration[] }>(
        '/api/observability/integrations/installed'
      );
      setIntegrations(response.integrations);
      setIntegrationsLoading(false);
    }

    fetchInstalledIntegrations();
  }, [http]);

  const noDataConfig: NoDataConfig | undefined =
    integrations.length !== 0 || integrationsLoading
      ? undefined
      : {
          solution: i18n.translate(
            'xpack.observability.integrationsOverviewPage.noDataConfig.solutionName.',
            {
              defaultMessage: 'Observability',
            }
          ),
          action: {
            elasticAgent: {
              button: i18n.translate(
                'xpack.observability.integrationsOverviewPage.noDataConfig.buttonLabel',
                {
                  defaultMessage: 'Add an integration',
                }
              ),
            },
          },
          docsLink: docLinks.links.observability.guide,
        };

  return (
    <EuiErrorBoundary>
      <ObservabilityPageTemplate
        noDataConfig={noDataConfig}
        pageSectionProps={{ alignment: integrationsLoading ? 'center' : 'top' }}
      >
        <HeaderMenu />
        {integrationsLoading ? (
          <EuiEmptyPrompt
            body={
              <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="xl" style={{ marginRight: '8px' }} />
                </EuiFlexItem>
                <EuiFlexItem>
                  {i18n.translate(
                    'xpack.observability.integrationsOverviewPage.loadingIndicatorLabel',
                    {
                      defaultMessage: 'Loading integrations',
                    }
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        ) : (
          <EuiFlexGroup direction="column">
            <EuiPageHeader
              pageTitle={i18n.translate(
                'xpack.observability.integrationsOverviewPage.pageHeaderLabel',
                {
                  defaultMessage: 'Integrations',
                }
              )}
              bottomBorder={true}
              iconType="logoObservability"
            />
            {integrations.map((integration) => (
              <EuiFlexItem key={integration.metadata.integration_name}>
                <IntegrationPanel integration={integration} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </ObservabilityPageTemplate>
    </EuiErrorBoundary>
  );
}
