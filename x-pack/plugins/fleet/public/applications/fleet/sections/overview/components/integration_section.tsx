/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { Loading } from '../../agents/components';
import { installationStatuses } from '../../../../../../common/constants';

export const OverviewIntegrationSection: React.FC = () => {
  const { getHref } = useLink();
  const packagesRequest = useGetPackages();
  const res = packagesRequest.data?.response;
  const total = res?.length ?? 0;
  const installed = res?.filter((p) => p.status === installationStatuses.Installed)?.length ?? 0;
  const updatablePackages =
    res?.filter(
      (item) => 'savedObject' in item && item.version > item.savedObject.attributes.version
    )?.length ?? 0;
  return (
    <EuiFlexItem component="section" data-test-subj="fleet-integrations-section">
      <OverviewPanel
        title={i18n.translate('xpack.fleet.overviewPageIntegrationsPanelTitle', {
          defaultMessage: 'Integrations',
        })}
        tooltip={i18n.translate('xpack.fleet.overviewPageIntegrationsPanelTooltip', {
          defaultMessage:
            'Browse and install integrations for the Elastic Stack. Add integrations to your agent policies to start sending data.',
        })}
        linkTo={getHref('integrations_all')}
        linkToText={i18n.translate('xpack.fleet.overviewPageIntegrationsPanelAction', {
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
                  id="xpack.fleet.overviewIntegrationsTotalTitle"
                  defaultMessage="Total available"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={total} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.fleet.overviewIntegrationsInstalledTitle"
                  defaultMessage="Installed"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={installed} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.fleet.overviewIntegrationsUpdatesAvailableTitle"
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
