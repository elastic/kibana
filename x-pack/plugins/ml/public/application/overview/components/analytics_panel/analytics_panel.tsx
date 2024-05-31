/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { EuiCallOut, EuiLink, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useStorage } from '@kbn/ml-local-storage';
import { FormattedMessage } from '@kbn/i18n-react';
import { type AnalyticStatsBarStats } from '../../../components/stats_bar';
import {
  OverviewStatsBar,
  type StatEntry,
} from '../../../components/collapsible_panel/collapsible_panel';
import type { MlStorageKey, TMlStorageMapped } from '../../../../../common/types/storage';
import { ML_OVERVIEW_PANELS } from '../../../../../common/types/storage';
import { AnalyticsTable } from './table';
import { getAnalyticsFactory } from '../../../data_frame_analytics/pages/analytics_management/services/analytics_service';
import type { DataFrameAnalyticsListRow } from '../../../data_frame_analytics/pages/analytics_management/components/analytics_list/common';
import { useMlLink } from '../../../contexts/kibana';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { useRefresh } from '../../../routing/use_refresh';
import type { GetDataFrameAnalyticsStatsResponseError } from '../../../services/ml_api_service/data_frame_analytics';
import { AnalyticsEmptyPrompt } from '../../../data_frame_analytics/pages/analytics_management/components/empty_prompt';
import { overviewPanelDefaultState } from '../../overview_page';
import { CollapsiblePanel } from '../../../components/collapsible_panel';

interface Props {
  setLazyJobCount: React.Dispatch<React.SetStateAction<number>>;
}
export const AnalyticsPanel: FC<Props> = ({ setLazyJobCount }) => {
  const refresh = useRefresh();

  const [analytics, setAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [analyticsStats, setAnalyticsStats] = useState<StatEntry[] | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<GetDataFrameAnalyticsStatsResponseError>();
  const [isInitialized, setIsInitialized] = useState(false);

  const manageJobsLink = useMlLink({
    page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
  });

  const [panelsState, setPanelsState] = useStorage<
    MlStorageKey,
    TMlStorageMapped<typeof ML_OVERVIEW_PANELS>
  >(ML_OVERVIEW_PANELS, overviewPanelDefaultState);

  const setAnalyticsStatsCustom = useCallback((stats: AnalyticStatsBarStats | undefined) => {
    if (!stats) return;

    const result = Object.entries(stats)
      .filter(([k, v]) => v.show)
      .map(([k, v]) => v);

    setAnalyticsStats(result);
  }, []);

  const getAnalytics = getAnalyticsFactory(
    setAnalytics,
    setAnalyticsStatsCustom,
    setErrorMessage,
    setIsInitialized,
    setLazyJobCount,
    false
  );

  useEffect(() => {
    getAnalytics(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const errorDisplay = (
    <EuiCallOut
      title={i18n.translate('xpack.ml.overview.analyticsList.errorPromptTitle', {
        defaultMessage: 'An error occurred getting the data frame analytics list.',
      })}
      color="danger"
      iconType="warning"
    >
      <pre>
        {errorMessage && errorMessage.message !== undefined
          ? errorMessage.message
          : JSON.stringify(errorMessage)}
      </pre>
    </EuiCallOut>
  );

  const noDFAJobs = errorMessage === undefined && isInitialized === true && analytics.length === 0;

  return (
    <CollapsiblePanel
      isOpen={panelsState.dfaJobs}
      onToggle={(update) => {
        setPanelsState({ ...panelsState, dfaJobs: update });
      }}
      header={
        <FormattedMessage
          id="xpack.ml.overview.analyticsList.PanelTitle"
          defaultMessage="Data Frame Analytics Jobs"
        />
      }
      headerItems={[
        ...(analyticsStats
          ? [
              <OverviewStatsBar
                inputStats={analyticsStats}
                dataTestSub={'mlOverviewAnalyticsStatsBar'}
              />,
            ]
          : []),
        <EuiLink href={manageJobsLink}>
          {i18n.translate('xpack.ml.overview.analyticsList.manageJobsButtonText', {
            defaultMessage: 'Manage jobs',
          })}
        </EuiLink>,
      ]}
    >
      {noDFAJobs ? <AnalyticsEmptyPrompt /> : null}

      {typeof errorMessage !== 'undefined' ? errorDisplay : null}

      {isInitialized === false && <EuiLoadingSpinner css={{ display: 'inline-block' }} size="xl" />}

      {isInitialized === true && analytics.length > 0 ? <AnalyticsTable items={analytics} /> : null}
    </CollapsiblePanel>
  );
};
