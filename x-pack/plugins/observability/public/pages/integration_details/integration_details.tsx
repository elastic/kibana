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
} from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { Integration } from '../../../common/integrations';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { useKibana } from '../../utils/kibana_react';
import { IntegrationPanel } from './integration_panel';

export function IntegrationDetailsPage() {
  const [integrationLoading, setIntegrationLoading] = useState(true);
  const [integration, setIntegration] = useState<Integration | null>(null);

  const { ObservabilityPageTemplate } = usePluginContext();
  const { integrationName } = useParams<{ integrationName: string }>();

  const {
    services: { http, docLinks },
  } = useKibana();

  useBreadcrumbs([
    {
      text: i18n.translate(
        'xpack.observability.integrationDetailsPage.breadcrumbs.integrationsLinkText',
        {
          defaultMessage: 'Integrations',
        }
      ),
      href: http.basePath.prepend('/app/observability/integrations'),
    },
    {
      text: integrationName,
    },
  ]);

  useEffect(() => {
    async function fetchIntegration() {
      const response = await http.get<{ integration: Integration }>(
        `/api/observability/integrations/${integrationName}`
      );
      setIntegration(response.integration);
      setIntegrationLoading(false);
    }

    fetchIntegration();
  }, [http, integrationName]);

  const url = pagePathGetters
    .integration_details_overview({
      pkgkey: integrationName,
    })
    .join('');

  const noDataConfig: NoDataConfig | undefined =
    integration !== null || integrationLoading
      ? undefined
      : {
          solution: i18n.translate(
            'xpack.observability.integrationDetailPage.noDataConfig.solutionName.',
            {
              defaultMessage: 'Observability',
            }
          ),
          action: {
            integration: {
              title: i18n.translate(
                'xpack.observability.integrationDetailPage.noDataConfig.buttonLabel',
                {
                  defaultMessage: 'Confirm integration setup',
                }
              ),
              description: i18n.translate(
                'xpack.observability.integrationDetailPage.noDataConfig.descriptionLabel',
                {
                  defaultMessage: 'We were unable to find the configuration for this Integration',
                }
              ),
              href: http.basePath.prepend(url),
            },
          },
          docsLink: docLinks.links.observability.guide,
        };

  return (
    <EuiErrorBoundary>
      <ObservabilityPageTemplate
        noDataConfig={noDataConfig}
        pageSectionProps={{ alignment: integrationLoading ? 'center' : 'top' }}
      >
        <HeaderMenu />
        {integrationLoading ? (
          <EuiEmptyPrompt
            body={
              <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="xl" style={{ marginRight: '8px' }} />
                </EuiFlexItem>
                <EuiFlexItem>
                  {i18n.translate(
                    'xpack.observability.integrationDetailPage.loadingIndicatorLabel',
                    {
                      defaultMessage: 'Loading integration',
                    }
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        ) : integration ? (
          <IntegrationPanel integration={integration} />
        ) : null}
      </ObservabilityPageTemplate>
    </EuiErrorBoundary>
  );
}
