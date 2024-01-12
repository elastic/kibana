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
  EuiCard,
  EuiEmptyPrompt,
  EuiErrorBoundary,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';
import { IntegrationSummary } from '../../../common/integrations';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { useKibana } from '../../utils/kibana_react';

export function IntegrationsOverviewPage() {
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [integrations, setIntegrations] = useState<IntegrationSummary[]>([]);
  const [searchValue, setSearchValue] = useState('');

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
      const response = await http.get<{ integrations: IntegrationSummary[] }>(
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

  const integrationDetailsUrl = http.basePath.prepend('/app/observability/integrations');

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
          <>
            <EuiPageHeader
              pageTitle={i18n.translate(
                'xpack.observability.integrationsOverviewPage.pageHeaderLabel',
                {
                  defaultMessage: 'Integrations',
                }
              )}
              bottomBorder={true}
              iconType="logoObservability"
              rightSideItems={[
                <EuiFieldSearch
                  data-test-subj="o11yIntegrationsOverviewPageFieldSearch"
                  placeholder="Find an Integration"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  isClearable={true}
                />,
              ]}
            />
            <EuiSpacer />
            <EuiFlexGroup>
              {integrations
                .filter((integration) =>
                  integration.name.toLowerCase().includes(searchValue.toLowerCase())
                )
                .map((integration) => (
                  <EuiFlexItem key={integration.name} grow={false} css={{ minWidth: '200px' }}>
                    {/* Would be great to use the Integration icon here and maybe have some good descriptive text */}
                    <EuiCard
                      icon={<EuiIcon size="xxl" type="database" color="success" />}
                      title={integration.display_name}
                      href={`${integrationDetailsUrl}/${integration.name}`}
                      hasBorder={true}
                    />
                  </EuiFlexItem>
                ))}
            </EuiFlexGroup>
          </>
        )}
      </ObservabilityPageTemplate>
    </EuiErrorBoundary>
  );
}
