/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiAccordion,
  EuiCallOut,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import './outlier_exploration.scss';

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

import {
  defaultSearchQuery,
  useResultsViewConfig,
  ANALYSIS_CONFIG_TYPE,
  INDEX_STATUS,
} from '../../../../common';

import { isGetDataFrameAnalyticsStatsResponseOk } from '../../../analytics_management/services/analytics_service/get_analytics';

import {
  DataFrameAnalyticsListRow,
  DATA_FRAME_MODE,
} from '../../../analytics_management/components/analytics_list/common';
import { ExpandedRow } from '../../../analytics_management/components/analytics_list/expanded_row';

import { ExplorationQueryBar } from '../exploration_query_bar';
import { ExplorationTitle } from '../exploration_title';
import { IndexPatternPrompt } from '../index_pattern_prompt';

import { getFeatureCount } from './common';
import { useOutlierData } from './use_outlier_data';

export type TableItem = Record<string, any>;

interface ExplorationProps {
  jobId: string;
}

const ACCORDION_PADDING_SIZE = 's';

export const OutlierExploration: FC<ExplorationProps> = React.memo(({ jobId }) => {
  const explorationTitle = i18n.translate('xpack.ml.dataframe.analytics.exploration.jobIdTitle', {
    defaultMessage: 'Outlier detection job ID {jobId}',
    values: { jobId },
  });

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

    const newExpandedRowItem = {
      checkpointing: {},
      config,
      id: config.id,
      job_type: Object.keys(config.analysis)[0] as ANALYSIS_CONFIG_TYPE,
      mode: DATA_FRAME_MODE.BATCH,
      state: stats.state,
      stats,
    };

    setExpandedRowItem(newExpandedRowItem);
  };

  useEffect(() => {
    fetchStats();
  }, [jobConfig?.id]);
  return (
    <>
      {(columnsWithCharts.length > 0 || searchQuery !== defaultSearchQuery) &&
        indexPattern !== undefined && (
          <>
            <>
              <EuiStat
                title="outlier detection"
                description="Analysis type"
                titleSize="s"
                style={{ float: 'left', width: '250px' }}
              />
              <EuiStat
                title="Han Solo"
                description="Pilot"
                titleSize="s"
                style={{ float: 'left', width: '250px' }}
              />
              <EuiStat
                title="less than 12"
                description="Parsecs"
                titleSize="s"
                style={{ float: 'left', width: '250px' }}
              />
              <EuiStat
                title="... can go here."
                description="Some main metrics ..."
                titleSize="s"
                style={{ float: 'left', width: '250px' }}
              />
            </>
            <EuiSpacer size="l" style={{ clear: 'both' }} />
            <ExplorationQueryBar indexPattern={indexPattern} setSearchQuery={setSearchQuery} />
            <EuiSpacer size="m" />
          </>
        )}

      <EuiAccordion
        id="mlDFAnalyticsOutlierExplorationStatsAccordion"
        buttonContent={
          <>
            <EuiTitle size="s">
              <h5>Analysis information</h5>
            </EuiTitle>
            <EuiText color="subdued" size="s">
              Data counts, memory usage, outlier detection stats
            </EuiText>
          </>
        }
        paddingSize={ACCORDION_PADDING_SIZE}
        initialIsOpen={true}
      >
        {(columnsWithCharts.length > 0 || searchQuery !== defaultSearchQuery) &&
          indexPattern !== undefined &&
          jobConfig !== undefined &&
          columnsWithCharts.length > 0 &&
          tableItems.length > 0 &&
          expandedRowItem !== undefined && <ExpandedRow item={expandedRowItem} />}
      </EuiAccordion>
      <EuiHorizontalRule size="full" margin="xs" />

      <EuiAccordion
        id="mlDFAnalyticsOutlierExplorationTableAccordion"
        buttonContent={
          <>
            <EuiTitle size="s">
              <h5>Results table</h5>
            </EuiTitle>
            <EuiText color="subdued" size="s">
              Color-coded by outlier score
            </EuiText>
          </>
        }
        paddingSize={ACCORDION_PADDING_SIZE}
        initialIsOpen={true}
      >
        <EuiPanel data-test-subj="mlDFAnalyticsOutlierExplorationTablePanel">
          {jobConfig !== undefined && needsDestIndexPattern && (
            <IndexPatternPrompt destIndex={jobConfig.dest.index} />
          )}
          {(columnsWithCharts.length > 0 || searchQuery !== defaultSearchQuery) &&
            indexPattern !== undefined && (
              <>
                <ColorRangeLegend
                  colorRange={colorRange}
                  title={i18n.translate(
                    'xpack.ml.dataframe.analytics.exploration.colorRangeLegendTitle',
                    {
                      defaultMessage: 'Feature influence score',
                    }
                  )}
                />
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
        </EuiPanel>
      </EuiAccordion>
      <EuiHorizontalRule size="full" margin="xs" />
    </>
  );
});
