/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiI18nNumber } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiButtonEmpty,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { OverviewPanel } from './overview_panel';
import { OverviewStats } from './overview_stats';
import { useLink, useGetPackageConfigs } from '../../../hooks';
import { AgentConfig } from '../../../types';
import { Loading } from '../../fleet/components';

export const OverviewConfigurationSection: React.FC<{ agentConfigs: AgentConfig[] }> = ({
  agentConfigs,
}) => {
  const { getHref } = useLink();
  const packageConfigsRequest = useGetPackageConfigs({
    page: 1,
    perPage: 10000,
  });

  return (
    <EuiFlexItem component="section">
      <OverviewPanel>
        <header>
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.ingestManager.overviewPageConfigurationsPanelTitle"
                defaultMessage="Agent configurations"
              />
            </h2>
          </EuiTitle>
          <EuiButtonEmpty size="xs" flush="right" href={getHref('configurations_list')}>
            <FormattedMessage
              id="xpack.ingestManager.overviewPageConfigurationsPanelAction"
              defaultMessage="View configs"
            />
          </EuiButtonEmpty>
        </header>
        <OverviewStats>
          {packageConfigsRequest.isLoading ? (
            <Loading />
          ) : (
            <>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ingestManager.overviewConfigTotalTitle"
                  defaultMessage="Total available"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={agentConfigs.length} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ingestManager.overviewPackageConfigTitle"
                  defaultMessage="Configured integrations"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={packageConfigsRequest.data?.total ?? 0} />
              </EuiDescriptionListDescription>
            </>
          )}
        </OverviewStats>
      </OverviewPanel>
    </EuiFlexItem>
  );
};
