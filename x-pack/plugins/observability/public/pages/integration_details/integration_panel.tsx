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
  EuiSpacer,
  EuiSuperDatePicker,
  OnTimeChangeProps,
} from '@elastic/eui';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import React, { useState } from 'react';
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
    },
  } = useKibana();

  const url = pagePathGetters.integration_details_overview({
    pkgkey: integration.metadata.integration_name,
  });

  const onTimeChange = ({ start: newStart, end: newEnd }: OnTimeChangeProps) => {
    setStart(newStart);
    setEnd(newEnd);
  };

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

      {/* Show links to selected dashboards (from the metadata) */}
      {/* Show links to each logs data set in the Logs Explorer (from the package) */}
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
