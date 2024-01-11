/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiSplitPanel, EuiTitle } from '@elastic/eui';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import React from 'react';
import { Integration } from '../../../common/integrations';
import { useKibana } from '../../utils/kibana_react';
import { AssetsList } from './assets_list';

export function IntegrationPanel({ integration }: { integration: Integration }) {
  const {
    services: {
      http: { basePath },
    },
  } = useKibana();

  const url = pagePathGetters.integration_details_overview({
    pkgkey: integration.metadata.integration_name,
  });

  return (
    <EuiSplitPanel.Outer hasBorder={true}>
      <EuiSplitPanel.Inner color="subdued">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="database" size="l" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2>{integration.metadata.display_name}</h2>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false} css={{ marginLeft: 'auto' }}>
            <EuiLink
              data-test-subj="o11yIntegrationPanelIntegrationOverviewLink"
              href={basePath.prepend(url.join(''))}
            >
              {i18n.translate('xpack.observability.integrationPanel.integrationPageLinkLabel', {
                defaultMessage: 'View integration',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>

      {/* Show links to selected dashboards (from the metadata) */}
      {/* Show links to each logs data set in the Logs Explorer (from the package) */}
      {/* Add a link to APM data if there is any (how to find out?) */}

      <EuiSplitPanel.Inner>
        <EuiFlexGroup direction="column" gutterSize="s">
          {integration.metadata.assets.map((asset) => (
            <AssetsList
              key={asset.identifier_field}
              asset={asset}
              integrationName={integration.metadata.integration_name}
            />
          ))}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}
