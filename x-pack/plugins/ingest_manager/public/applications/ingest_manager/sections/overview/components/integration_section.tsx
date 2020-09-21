/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexItem,
  EuiI18nNumber,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { OverviewPanel } from './overview_panel';
import { OverviewStats } from './overview_stats';
import { useLink, useGetPackages } from '../../../hooks';
import { Loading } from '../../fleet/components';
import { InstallationStatus } from '../../../types';

export const OverviewIntegrationSection: React.FC = () => {
  const { getHref } = useLink();
  const packagesRequest = useGetPackages();
  const res = packagesRequest.data?.response;
  const total = res?.length ?? 0;
  const installed = res?.filter((p) => p.status === InstallationStatus.installed)?.length ?? 0;
  const updatablePackages =
    res?.filter(
      (item) => 'savedObject' in item && item.version > item.savedObject.attributes.version
    )?.length ?? 0;
  return (
    <EuiFlexItem component="section">
      <OverviewPanel
        title={i18n.translate('xpack.ingestManager.overviewPageIntegrationsPanelTitle', {
          defaultMessage: 'Integrations',
        })}
        tooltip={i18n.translate('xpack.ingestManager.overviewPageIntegrationsPanelTooltip', {
          defaultMessage:
            'Browse and install integrations for the Elastic Stack. Add integrations to your agent policies to start sending data.',
        })}
        linkTo={getHref('integrations_all')}
        linkToText={i18n.translate('xpack.ingestManager.overviewPageIntegrationsPanelAction', {
          defaultMessage: 'View integrations',
        })}
      >
        <OverviewStats>
          {packagesRequest.isLoading ? (
            <Loading />
          ) : (
            <>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ingestManager.overviewIntegrationsTotalTitle"
                  defaultMessage="Total available"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={total} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ingestManager.overviewIntegrationsInstalledTitle"
                  defaultMessage="Installed"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={installed} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ingestManager.overviewIntegrationsUpdatesAvailableTitle"
                  defaultMessage="Updates available"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={updatablePackages} />
              </EuiDescriptionListDescription>
            </>
          )}
        </OverviewStats>
      </OverviewPanel>
    </EuiFlexItem>
  );
};
