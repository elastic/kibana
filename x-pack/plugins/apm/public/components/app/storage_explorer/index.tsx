/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiLink,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { IndexLifecyclePhaseSelect } from './index_lifecycle_phase_select';
import { ServicesTable } from './services_table';
import { SearchBar } from '../../shared/search_bar';
import { StorageChart } from './storage_chart';
import { PermissionDenied } from './prompts/permission_denied';
import { useFetcher, FETCH_STATUS } from '../../../hooks/use_fetcher';
import { SummaryStats } from './summary_stats';
import { ApmEnvironmentFilter } from '../../shared/environment_filter';
import { TipsAndResources } from './resources/tips_and_resources';
import { useLocalStorage } from '../../../hooks/use_local_storage';

export function StorageExplorer() {
  const router = useApmRouter();
  const [
    crossClusterSearchCalloutDismissed,
    setCrossClusterSearchCalloutDismissed,
  ] = useLocalStorage('apm.storageExplorer.ccsCalloutDismissed', false);

  const { data: hasPrivilegesData, status: hasPrivilegesStatus } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/storage_explorer/privileges');
    },
    []
  );

  const { data: isCrossClusterSearchData } = useFetcher(
    (callApmApi) => {
      if (!crossClusterSearchCalloutDismissed) {
        return callApmApi(
          'GET /internal/apm/storage_explorer/is_cross_cluster_search'
        );
      }
    },
    [crossClusterSearchCalloutDismissed]
  );

  const loading = hasPrivilegesStatus === FETCH_STATUS.LOADING;

  if (loading) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingSpinner size="xl" />}
        titleSize="xs"
        title={
          <h2>
            {i18n.translate('xpack.apm.storageExplorer.loadingPromptTitle', {
              defaultMessage: 'Loading Storage Explorer...',
            })}
          </h2>
        }
      />
    );
  }

  if (!hasPrivilegesData?.hasPrivileges) {
    return <PermissionDenied />;
  }

  return (
    <>
      <SearchBar />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <ApmEnvironmentFilter />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <IndexLifecyclePhaseSelect />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />

      <EuiCallOut
        title={i18n.translate(
          'xpack.apm.storageExplorer.longLoadingTimeCalloutTitle',
          {
            defaultMessage: 'Long loading time?',
          }
        )}
        iconType="timeRefresh"
      >
        <FormattedMessage
          id="xpack.apm.storageExplorer.longLoadingTimeCalloutText"
          defaultMessage="Enable progressive loading of data in {apmGeneralSettingsLink}."
          values={{
            apmGeneralSettingsLink: (
              <EuiLink href={router.link('/settings/general-settings')}>
                {i18n.translate(
                  'xpack.apm.storageExplorer.longLoadingTimeCalloutLink',
                  {
                    defaultMessage: 'APM general settings',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>

      {!crossClusterSearchCalloutDismissed &&
        isCrossClusterSearchData?.isCrossClusterSearch && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              title={i18n.translate(
                'xpack.apm.storageExplorer.crossClusterSearchCalloutTitle',
                {
                  defaultMessage: 'Searching across clusters?',
                }
              )}
              iconType="search"
            >
              <p>
                {i18n.translate(
                  'xpack.apm.storageExplorer.crossClusterSearchCalloutText',
                  {
                    defaultMessage:
                      'While getting document count works with cross-cluster search, index statistics such as size are only displayed for data that are stored in this cluster.',
                  }
                )}
              </p>
              <EuiButton
                onClick={() => setCrossClusterSearchCalloutDismissed(true)}
              >
                {i18n.translate(
                  'xpack.apm.storageExplorer.crossClusterSearchCalloutText.dimissButton',
                  {
                    defaultMessage: 'Dismiss',
                  }
                )}
              </EuiButton>
            </EuiCallOut>
          </>
        )}

      <EuiSpacer />
      <SummaryStats />
      <EuiSpacer />
      <StorageChart />
      <EuiSpacer />
      <ServicesTable />
      <EuiSpacer />
      <TipsAndResources />
    </>
  );
}
