/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { DataFrameAnalysisConfigType } from '../../../../../../../common/types/data_frame_analytics';

import {
  useColorRange,
  COLOR_RANGE,
  COLOR_RANGE_SCALE,
} from '../../../../../components/color_range_legend';
import { ColorRangeLegend } from '../../../../../components/color_range_legend';
import { DataGrid } from '../../../../../components/data_grid';
import { SavedSearchQuery } from '../../../../../contexts/ml';
import { getToastNotifications } from '../../../../../util/dependency_cache';
import { ml } from '../../../../../services/ml_api_service';

import { defaultSearchQuery, useResultsViewConfig } from '../../../../common';

import { isGetDataFrameAnalyticsStatsResponseOk } from '../../../analytics_management/services/analytics_service/get_analytics';

import {
  DataFrameAnalyticsListRow,
  DATA_FRAME_MODE,
} from '../../../analytics_management/components/analytics_list/common';
import { ExpandedRow } from '../../../analytics_management/components/analytics_list/expanded_row';

import { ExplorationQueryBar } from '../exploration_query_bar';
import { IndexPatternPrompt } from '../index_pattern_prompt';

import { getFeatureCount } from './common';
import { useOutlierData } from './use_outlier_data';

export type TableItem = Record<string, any>;

interface ExplorationProps {
  jobId: string;
}

export const OutlierExploration: FC<ExplorationProps> = React.memo(({ jobId }) => {
  const { indexPattern, jobConfig, needsDestIndexPattern } = useResultsViewConfig(jobId);
  const [searchQuery, setSearchQuery] = useState<SavedSearchQuery>(defaultSearchQuery);
  const outlierData = useOutlierData(indexPattern, jobConfig, searchQuery);

  const { columnsWithCharts, tableItems } = outlierData;

  const colorRange = useColorRange(
    COLOR_RANGE.BLUE,
    COLOR_RANGE_SCALE.INFLUENCER,
    jobConfig !== undefined ? getFeatureCount(jobConfig.dest.results_field, tableItems) : 1
  );

  const [expandedRowItem, setExpandedRowItem] = useState<DataFrameAnalyticsListRow | undefined>(
    undefined
  );

  const fetchStats = async () => {
    const analyticsConfigs = await ml.dataFrameAnalytics.getDataFrameAnalytics(jobId);
    const analyticsStats = await ml.dataFrameAnalytics.getDataFrameAnalyticsStats(jobId);

    const config = analyticsConfigs.data_frame_analytics[0];
    const stats = isGetDataFrameAnalyticsStatsResponseOk(analyticsStats)
      ? analyticsStats.data_frame_analytics[0]
      : undefined;

    if (stats === undefined) {
      return;
    }

    const newExpandedRowItem: DataFrameAnalyticsListRow = {
      checkpointing: {},
      config,
      id: config.id,
      job_type: Object.keys(config.analysis)[0] as DataFrameAnalysisConfigType,
      mode: DATA_FRAME_MODE.BATCH,
      state: stats.state,
      stats,
    };

    setExpandedRowItem(newExpandedRowItem);
  };

  useEffect(() => {
    fetchStats();
  }, [jobConfig?.id]);

  const [isExpandedAnalysisDetails, setIsExpandedAnalysisDetails] = useState(false);
  const toggleExpandedAnalysisDetails = () => {
    setIsExpandedAnalysisDetails(!isExpandedAnalysisDetails);
  };

  const [isExpandedResultsTable, setIsExpandedResultsTable] = useState(true);
  const toggleExpandedResultsTable = () => {
    setIsExpandedResultsTable(!isExpandedResultsTable);
  };

  return (
    <>
      {(columnsWithCharts.length > 0 || searchQuery !== defaultSearchQuery) &&
        indexPattern !== undefined && (
          <>
            <ExplorationQueryBar indexPattern={indexPattern} setSearchQuery={setSearchQuery} />
            <EuiSpacer size="m" />
          </>
        )}

      <EuiPanel paddingSize="none">
        <div style={{ padding: '10px' }}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h2>Analysis</h2>
              </EuiTitle>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <p>Type</p>
                  </EuiText>
                  <EuiBadge>outlier detection</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <p>Source index</p>
                  </EuiText>
                  <EuiBadge>glass_source</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <p>Destination index</p>
                  </EuiText>
                  <EuiBadge>glass_outlier_detection</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                onClick={toggleExpandedAnalysisDetails}
                iconType={isExpandedAnalysisDetails ? 'arrowUp' : 'arrowDown'}
                size="s"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        {isExpandedAnalysisDetails && (
          <>
            <EuiHorizontalRule size="full" margin="none" />
            {(columnsWithCharts.length > 0 || searchQuery !== defaultSearchQuery) &&
              indexPattern !== undefined &&
              jobConfig !== undefined &&
              columnsWithCharts.length > 0 &&
              tableItems.length > 0 &&
              expandedRowItem !== undefined && <ExpandedRow item={expandedRowItem} />}
          </>
        )}
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiPanel paddingSize="none" data-test-subj="mlDFAnalyticsOutlierExplorationTablePanel">
        <div style={{ padding: '10px' }}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h2>Results</h2>
              </EuiTitle>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <p>Total docs</p>
                  </EuiText>
                  <EuiBadge>123456</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <p>Training docs</p>
                  </EuiText>
                  <EuiBadge>1234 (12%)</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <p>Moar Stats</p>
                  </EuiText>
                  <EuiBadge>42</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem>
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
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                onClick={toggleExpandedResultsTable}
                iconType={isExpandedResultsTable ? 'arrowUp' : 'arrowDown'}
                size="s"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        {isExpandedResultsTable && (
          <>
            {jobConfig !== undefined && needsDestIndexPattern && (
              <IndexPatternPrompt destIndex={jobConfig.dest.index} />
            )}
            {(columnsWithCharts.length > 0 || searchQuery !== defaultSearchQuery) &&
              indexPattern !== undefined && (
                <>
                  <EuiSpacer size="s" />
                  {columnsWithCharts.length > 0 && tableItems.length > 0 && (
                    <DataGrid
                      {...outlierData}
                      dataTestSubj="mlExplorationDataGrid"
                      toastNotifications={getToastNotifications()}
                    />
                  )}
                </>
              )}
          </>
        )}
      </EuiPanel>
    </>
  );
});
