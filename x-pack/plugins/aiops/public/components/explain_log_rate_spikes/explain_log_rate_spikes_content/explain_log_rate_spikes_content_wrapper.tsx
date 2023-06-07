/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { pick } from 'lodash';
import type { Moment } from 'moment';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { EuiCallOut } from '@elastic/eui';

import type { WindowParameters } from '@kbn/aiops-utils';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';

import { AiopsAppContext, type AiopsAppDependencies } from '../../../hooks/use_aiops_app_context';
import { DataSourceContext } from '../../../hooks/use_data_source';
import { AIOPS_STORAGE_KEYS } from '../../../types/storage';

import { SpikeAnalysisTableRowStateProvider } from '../../spike_analysis_table/spike_analysis_table_row_provider';

import { ExplainLogRateSpikesContent } from './explain_log_rate_spikes_content';

const localStorage = new Storage(window.localStorage);

export interface ExplainLogRateSpikesContentWrapperProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** App dependencies */
  appDependencies: AiopsAppDependencies;
  /** On global timefilter update */
  setGlobalState?: any;
  /** Timestamp for start of initial analysis */
  initialAnalysisStart?: number | WindowParameters;
  timeRange?: { min: Moment; max: Moment };
  /** Elasticsearch query to pass to analysis endpoint */
  esSearchQuery?: estypes.QueryDslQueryContainer;
  barColorOverride?: string;
  barHighlightColorOverride?: string;
}

export const ExplainLogRateSpikesContentWrapper: FC<ExplainLogRateSpikesContentWrapperProps> = ({
  dataView,
  appDependencies,
  setGlobalState,
  initialAnalysisStart,
  timeRange,
  esSearchQuery,
  barColorOverride,
  barHighlightColorOverride,
}) => {
  if (!dataView) return null;

  if (!dataView.isTimeBased()) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.aiops.index.dataViewNotBasedOnTimeSeriesNotificationTitle', {
          defaultMessage: 'The data view "{dataViewTitle}" is not based on a time series.',
          values: { dataViewTitle: dataView.getName() },
        })}
        color="danger"
        iconType="warning"
      >
        <p>
          {i18n.translate('xpack.aiops.index.dataViewNotBasedOnTimeSeriesNotificationDescription', {
            defaultMessage: 'Log rate spike analysis only runs over time-based indices.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  const datePickerDeps = {
    ...pick(appDependencies, ['data', 'http', 'notifications', 'theme', 'uiSettings']),
    toMountPoint,
    wrapWithTheme,
    uiSettingsKeys: UI_SETTINGS,
  };

  return (
    <AiopsAppContext.Provider value={appDependencies}>
      <UrlStateProvider>
        <DataSourceContext.Provider value={{ dataView, savedSearch: null }}>
          <SpikeAnalysisTableRowStateProvider>
            <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
              <DatePickerContextProvider {...datePickerDeps}>
                <ExplainLogRateSpikesContent
                  dataView={dataView}
                  setGlobalState={setGlobalState}
                  initialAnalysisStart={initialAnalysisStart}
                  timeRange={timeRange}
                  esSearchQuery={esSearchQuery}
                  barColorOverride={barColorOverride}
                  barHighlightColorOverride={barHighlightColorOverride}
                />
              </DatePickerContextProvider>
            </StorageContextProvider>
          </SpikeAnalysisTableRowStateProvider>
        </DataSourceContext.Provider>
      </UrlStateProvider>
    </AiopsAppContext.Provider>
  );
};
