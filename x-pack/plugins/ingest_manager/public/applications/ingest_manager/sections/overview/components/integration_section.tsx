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
import { useLink, useGetPackages } from '../../../hooks';
import { EPM_PATH } from '../../../constants';
import { Loading } from '../../fleet/components';
import { InstallationStatus } from '../../../types';

export const OverviewIntegrationSection: React.FC = () => {
  const packagesRequest = useGetPackages();

  const total = packagesRequest.data?.response?.length ?? 0;
  const installed =
    packagesRequest.data?.response?.filter(p => p.status === InstallationStatus.installed)
      ?.length ?? 0;
  return (
    <EuiFlexItem component="section">
      <OverviewPanel>
        <header>
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.ingestManager.overviewPageIntegrationsPanelTitle"
                defaultMessage="Integrations"
              />
            </h2>
          </EuiTitle>
          <EuiButtonEmpty size="xs" flush="right" href={useLink(EPM_PATH)}>
            <FormattedMessage
              id="xpack.ingestManager.overviewPageIntegrationsPanelAction"
              defaultMessage="View integrations"
            />
          </EuiButtonEmpty>
        </header>
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
            </>
          )}
        </OverviewStats>
      </OverviewPanel>
    </EuiFlexItem>
  );
};
