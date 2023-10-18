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
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isEmpty } from 'lodash';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { IndexLifecyclePhaseSelect } from './index_lifecycle_phase_select';
import { ServicesTable } from './services_table';
import { SearchBar } from '../../shared/search_bar/search_bar';
import { StorageChart } from './storage_chart';
import { PermissionDenied } from './prompts/permission_denied';
import {
  useFetcher,
  FETCH_STATUS,
  isPending,
} from '../../../hooks/use_fetcher';
import { SummaryStats } from './summary_stats';
import { ApmEnvironmentFilter } from '../../shared/environment_filter';
import { TipsAndResources } from './resources/tips_and_resources';
import { useLocalStorage } from '../../../hooks/use_local_storage';
import { getKibanaAdvancedSettingsHref } from './get_storage_explorer_links';
import { useProgressiveFetcher } from '../../../hooks/use_progressive_fetcher';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';

type CalloutType = 'crossClusterSearch' | 'optimizePerformance';

const CALLOUT_DISMISS_INITIAL_STATE: Record<CalloutType, boolean> = {
  crossClusterSearch: false,
  optimizePerformance: false,
};

const dismissButtonText = i18n.translate(
  'xpack.apm.storageExplorer.callout.dimissButton',
  {
    defaultMessage: 'Dismiss',
  }
);

export function StorageExplorer() {
  const { core } = useApmPluginContext();
  const {
    query: { rangeFrom, rangeTo, environment, kuery, indexLifecyclePhase },
  } = useApmParams('/storage-explorer');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const [calloutDismissed, setCalloutDismissed] = useLocalStorage(
    'apm.storageExplorer.calloutDismissed',
    CALLOUT_DISMISS_INITIAL_STATE
  );

  const { data: hasPrivilegesData, status: hasPrivilegesStatus } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/storage_explorer/privileges');
    },
    []
  );

  const { data: isCrossClusterSearchData } = useFetcher(
    (callApmApi) => {
      if (!calloutDismissed.crossClusterSearch) {
        return callApmApi(
          'GET /internal/apm/storage_explorer/is_cross_cluster_search'
        );
      }
    },
    [calloutDismissed]
  );

  const { data: summaryStatsData, status: summaryStatsStatus } =
    useProgressiveFetcher(
      (callApmApi) => {
        return callApmApi('GET /internal/apm/storage_explorer_summary_stats', {
          params: {
            query: {
              indexLifecyclePhase,
              environment,
              kuery,
              start,
              end,
            },
          },
        });
      },
      [indexLifecyclePhase, environment, kuery, start, end]
    );

  const loadingSummaryStats = isPending(summaryStatsStatus);

  const hasSummaryStatsData = !isEmpty(summaryStatsData);

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

      {!calloutDismissed.optimizePerformance && (
        <EuiCallOut
          title={i18n.translate(
            'xpack.apm.storageExplorer.longLoadingTimeCalloutTitle',
            {
              defaultMessage: 'Long loading time?',
            }
          )}
          iconType="timeRefresh"
        >
          <p>
            <FormattedMessage
              id="xpack.apm.storageExplorer.longLoadingTimeCalloutText"
              defaultMessage="Enable progressive loading of data and optimized sorting for services list in {kibanaAdvancedSettingsLink}."
              values={{
                kibanaAdvancedSettingsLink: (
                  <EuiLink
                    data-test-subj="apmStorageExplorerKibanaAdvancedSettingsLink"
                    href={getKibanaAdvancedSettingsHref(core)}
                  >
                    {i18n.translate(
                      'xpack.apm.storageExplorer.longLoadingTimeCalloutLink',
                      {
                        defaultMessage: 'Kibana advanced settings',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
          <EuiButton
            data-test-subj="apmStorageExplorerButton"
            onClick={() =>
              setCalloutDismissed({
                ...calloutDismissed,
                optimizePerformance: true,
              })
            }
          >
            {dismissButtonText}
          </EuiButton>
        </EuiCallOut>
      )}

      {!calloutDismissed.crossClusterSearch &&
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
                data-test-subj="apmStorageExplorerButton"
                onClick={() =>
                  setCalloutDismissed({
                    ...calloutDismissed,
                    crossClusterSearch: true,
                  })
                }
              >
                {dismissButtonText}
              </EuiButton>
            </EuiCallOut>
          </>
        )}

      <EuiSpacer />
      <SummaryStats
        data={summaryStatsData}
        loading={loadingSummaryStats}
        hasData={hasSummaryStatsData}
      />
      <EuiSpacer />
      <EuiPanel hasShadow={false} hasBorder={true}>
        <StorageChart />
        <EuiSpacer />
        <ServicesTable
          summaryStatsData={summaryStatsData}
          loadingSummaryStats={loadingSummaryStats}
        />
      </EuiPanel>
      <EuiSpacer />
      <TipsAndResources />
    </>
  );
}
