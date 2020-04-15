/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';

import {
  useColorRange,
  COLOR_RANGE,
  COLOR_RANGE_SCALE,
} from '../../../../../components/color_range_legend';
import { ml } from '../../../../../services/ml_api_service';
import { ColorRangeLegend } from '../../../../../components/color_range_legend';
import { DataGrid } from '../../../../../components/data_grid';
import { SavedSearchQuery } from '../../../../../contexts/ml';
import { getToastNotifications } from '../../../../../util/dependency_cache';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { getIndexPatternIdFromName } from '../../../../../util/index_utils';
import { useMlContext } from '../../../../../contexts/ml';

import { defaultSearchQuery, DataFrameAnalyticsConfig, INDEX_STATUS } from '../../../../common';

import { getTaskStateBadge } from '../../../analytics_management/components/analytics_list/columns';
import { isGetDataFrameAnalyticsStatsResponseOk } from '../../../analytics_management/services/analytics_service/get_analytics';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';

import { ExplorationQueryBar } from '../exploration_query_bar';

import { useOutlierData } from './use_outlier_data';

export type TableItem = Record<string, any>;

const FEATURE_INFLUENCE = 'feature_influence';

const getFeatureCount = (resultsField: string, tableItems: TableItem[] = []) => {
  if (tableItems.length === 0) {
    return 0;
  }

  return Object.keys(tableItems[0]).filter(key =>
    key.includes(`${resultsField}.${FEATURE_INFLUENCE}.`)
  ).length;
};

const ExplorationTitle: FC<{ jobId: string }> = ({ jobId }) => (
  <EuiTitle size="xs">
    <span>
      {i18n.translate('xpack.ml.dataframe.analytics.exploration.jobIdTitle', {
        defaultMessage: 'Outlier detection job ID {jobId}',
        values: { jobId },
      })}
    </span>
  </EuiTitle>
);

interface ExplorationProps {
  jobId: string;
}

export const OutlierExploration: FC<ExplorationProps> = React.memo(({ jobId }) => {
  const mlContext = useMlContext();
  const [indexPattern, setIndexPattern] = useState<IndexPattern | undefined>(undefined);
  const [jobConfig, setJobConfig] = useState<DataFrameAnalyticsConfig | undefined>(undefined);
  const [jobStatus, setJobStatus] = useState<DATA_FRAME_TASK_STATE | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<SavedSearchQuery>(defaultSearchQuery);

  // get analytics configuration
  useEffect(() => {
    (async function() {
      const analyticsConfigs = await ml.dataFrameAnalytics.getDataFrameAnalytics(jobId);
      const analyticsStats = await ml.dataFrameAnalytics.getDataFrameAnalyticsStats(jobId);
      const stats = isGetDataFrameAnalyticsStatsResponseOk(analyticsStats)
        ? analyticsStats.data_frame_analytics[0]
        : undefined;

      if (stats !== undefined && stats.state) {
        setJobStatus(stats.state);
      }

      if (
        Array.isArray(analyticsConfigs.data_frame_analytics) &&
        analyticsConfigs.data_frame_analytics.length > 0
      ) {
        setJobConfig(analyticsConfigs.data_frame_analytics[0]);
      }
    })();
  }, []);

  // get index pattern and field caps
  useEffect(() => {
    (async () => {
      if (jobConfig !== undefined) {
        try {
          const destIndex = Array.isArray(jobConfig.dest.index)
            ? jobConfig.dest.index[0]
            : jobConfig.dest.index;
          const destIndexPatternId = getIndexPatternIdFromName(destIndex) || destIndex;
          let indexP: IndexPattern | undefined;

          try {
            indexP = await mlContext.indexPatterns.get(destIndexPatternId);
          } catch (e) {
            indexP = undefined;
          }

          if (indexP === undefined) {
            const sourceIndex = jobConfig.source.index[0];
            const sourceIndexPatternId = getIndexPatternIdFromName(sourceIndex) || sourceIndex;
            indexP = await mlContext.indexPatterns.get(sourceIndexPatternId);
          }

          if (indexP !== undefined) {
            setIndexPattern(indexP);
            await newJobCapsService.initializeFromIndexPattern(indexP, false, false);
          }
        } catch (e) {
          // eslint-disable-next-line
              console.log('Error loading index field data', e);
        }
      }
    })();
  }, [jobConfig && jobConfig.id]);

  const outlierData = useOutlierData(indexPattern, jobConfig, searchQuery);

  const { columns, errorMessage, status, tableItems } = outlierData;

  // if it's a searchBar syntax error leave the table visible so they can try again
  if (status === INDEX_STATUS.ERROR && !errorMessage.includes('parsing_exception')) {
    return (
      <EuiPanel grow={false}>
        <ExplorationTitle jobId={jobId} />
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataframe.analytics.exploration.indexError', {
            defaultMessage: 'An error occurred loading the index data.',
          })}
          color="danger"
          iconType="cross"
        >
          <p>{errorMessage}</p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  let tableError =
    status === INDEX_STATUS.ERROR && errorMessage.includes('parsing_exception')
      ? errorMessage
      : undefined;

  if (status === INDEX_STATUS.LOADED && tableItems.length === 0 && tableError === undefined) {
    tableError = i18n.translate('xpack.ml.dataframe.analytics.exploration.noDataCalloutBody', {
      defaultMessage:
        'The query for the index returned no results. Please make sure the index contains documents and your query is not too restrictive.',
    });
  }

  const colorRange = useColorRange(
    COLOR_RANGE.BLUE,
    COLOR_RANGE_SCALE.INFLUENCER,
    jobConfig !== undefined ? getFeatureCount(jobConfig.dest.results_field, tableItems) : 1
  );

  return (
    <EuiPanel data-test-subj="mlDFAnalyticsOutlierExplorationTablePanel">
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        gutterSize="s"
      >
        <EuiFlexItem grow={false}>
          <ExplorationTitle jobId={jobId} />
        </EuiFlexItem>
        {jobStatus !== undefined && (
          <EuiFlexItem grow={false}>
            <span>{getTaskStateBadge(jobStatus)}</span>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      {(columns.length > 0 || searchQuery !== defaultSearchQuery) && indexPattern !== undefined && (
        <>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <ExplorationQueryBar indexPattern={indexPattern} setSearchQuery={setSearchQuery} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSpacer size="s" />
              <ColorRangeLegend
                colorRange={colorRange}
                title={i18n.translate(
                  'xpack.ml.dataframe.analytics.exploration.colorRangeLegendTitle',
                  {
                    defaultMessage: 'Feature influence score',
                  }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          {columns.length > 0 && tableItems.length > 0 && (
            <DataGrid
              {...outlierData}
              dataTestSubj="mlExplorationDataGrid"
              toastNotifications={getToastNotifications()}
            />
          )}
        </>
      )}
    </EuiPanel>
  );
});
