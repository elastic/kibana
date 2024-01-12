/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPageHeader,
  EuiPanel,
  EuiSpacer,
  EuiSuperDatePicker,
  OnTimeChangeProps,
} from '@elastic/eui';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import React, { useState } from 'react';
import {
  SingleDatasetLocatorParams,
  SINGLE_DATASET_LOCATOR_ID,
} from '@kbn/deeplinks-observability';
import { Integration } from '../../../common/integrations';
import { useKibana } from '../../utils/kibana_react';
import { AssetsList } from './assets_list';
import { SectionContainer } from '../overview/components/sections/section_container';

export function IntegrationPanel({ integration }: { integration: Integration }) {
  const [searchValue, setSearchValue] = useState('');
  const [start, setStart] = useState('now-15m');
  const [end, setEnd] = useState('now');

  const {
    services: {
      http: { basePath },
      share: {
        url: { locators },
      },
    },
  } = useKibana();

  const url = pagePathGetters.integration_details_overview({
    pkgkey: integration.metadata.integration_name,
  });

  const onTimeChange = ({ start: newStart, end: newEnd }: OnTimeChangeProps) => {
    setStart(newStart);
    setEnd(newEnd);
  };

  const logExplorerLocator = locators.get<SingleDatasetLocatorParams>(SINGLE_DATASET_LOCATOR_ID);

  return (
    <>
      <EuiPageHeader
        pageTitle={integration.metadata.display_name}
        bottomBorder={true}
        iconType="database"
        rightSideItems={[
          <EuiLink
            data-test-subj="o11yIntegrationPanelIntegrationOverviewLink"
            href={basePath.prepend(url.join(''))}
          >
            {i18n.translate('xpack.observability.integrationPanel.integrationPageLinkLabel', {
              defaultMessage: 'View integration',
            })}
          </EuiLink>,
        ]}
        rightSideGroupProps={{
          alignItems: 'center',
        }}
      />
      <EuiSpacer />
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={true}>
          <EuiFieldSearch
            fullWidth={true}
            data-test-subj="o11yIntegrationDetailsPageFieldSearch"
            placeholder="Filter assets"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            isClearable={true}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            isLoading={false}
            start={start}
            end={end}
            onTimeChange={onTimeChange}
            showUpdateButton={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />

      <SectionContainer title="Logs" hasError={false}>
        <EuiFlexGroup>
          {integration.package.data_streams
            .filter((dataStream) => dataStream.type === 'logs')
            .map((logStream) => (
              <EuiFlexItem key={logStream.title} grow={false}>
                <EuiLink
                  data-test-subj="o11yIntegrationPanelLink"
                  href={logExplorerLocator?.getRedirectUrl({
                    integration: integration.metadata.integration_name,
                    dataset: logStream.dataset,
                    timeRange: {
                      to: start,
                      from: end,
                    },
                  })}
                >
                  <EuiPanel color="subdued">{logStream.title}</EuiPanel>
                </EuiLink>
              </EuiFlexItem>
            ))}
        </EuiFlexGroup>
      </SectionContainer>
      <EuiSpacer />

      {/* Show links to selected dashboards (from the metadata) */}
      {/* Add a link to APM data if there is any (how to find out?) */}

      <EuiFlexGroup direction="column" gutterSize="s">
        {integration.metadata.assets.map((asset) => (
          <SectionContainer
            key={asset.identifier_field}
            title={asset.display_name}
            hasError={false}
          >
            <AssetsList
              asset={asset}
              integrationName={integration.metadata.integration_name}
              filter={searchValue}
              timeRange={{ from: start, to: end }}
            />
          </SectionContainer>
        ))}
      </EuiFlexGroup>
    </>
  );
}
