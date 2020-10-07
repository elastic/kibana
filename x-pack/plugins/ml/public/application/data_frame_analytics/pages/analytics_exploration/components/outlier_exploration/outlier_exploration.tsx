/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, FC } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiDataGridColumn,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
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

import { getAnalysisType, defaultSearchQuery, useResultsViewConfig } from '../../../../common';

import { isGetDataFrameAnalyticsStatsResponseOk } from '../../../analytics_management/services/analytics_service/get_analytics';

import {
  DataFrameAnalyticsListRow,
  DATA_FRAME_MODE,
} from '../../../analytics_management/components/analytics_list/common';
import { ExpandedRow } from '../../../analytics_management/components/analytics_list/expanded_row';

import { ExpandableSection, ExpandableSectionProps } from '../expandable_section';
import { ExplorationQueryBar } from '../exploration_query_bar';
import { IndexPatternPrompt } from '../index_pattern_prompt';

import { getFeatureCount } from './common';
import { useOutlierData } from './use_outlier_data';

const getAnalyticsSectionHeaderItems = (
  expandedRowItem: DataFrameAnalyticsListRow | undefined
): ExpandableSectionProps['headerItems'] => {
  return expandedRowItem !== undefined
    ? [
        {
          id: 'analysisTypeLabel',
          label: (
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.exploration.analysisTypeLabel"
              defaultMessage="Type"
            />
          ),
          value: expandedRowItem.job_type,
        },
        {
          id: 'analysisSourceIndexLabel',
          label: (
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.exploration.analysisSourceIndexLabel"
              defaultMessage="Source index"
            />
          ),
          value: expandedRowItem.config.source.index,
        },
        {
          id: 'analysisDestinationIndexLabel',
          label: (
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.exploration.analysisDestinationIndexLabel"
              defaultMessage="Destination index"
            />
          ),
          value: expandedRowItem.config.dest.index,
        },
      ]
    : 'loading';
};

const getResultsSectionHeaderItems = (
  columnsWithCharts: EuiDataGridColumn[],
  tableItems: Array<Record<string, any>>,
  rowCount: number,
  colorRange: ReturnType<typeof useColorRange>
): ExpandableSectionProps['headerItems'] => {
  return columnsWithCharts.length > 0 && tableItems.length > 0
    ? [
        {
          id: 'explorationTableTotalDocs',
          label: (
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.exploration.explorationTableTotalDocsLabel"
              defaultMessage="Total docs"
            />
          ),
          value: rowCount,
        },
        {
          id: 'colorRangeLegend',
          value: (
            <ColorRangeLegend
              colorRange={colorRange}
              title={i18n.translate(
                'xpack.ml.dataframe.analytics.exploration.colorRangeLegendTitle',
                {
                  defaultMessage: 'Feature influence score',
                }
              )}
            />
          ),
        },
      ]
    : 'loading';
};

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

  const [expandedRowItem, setExpandedRowItem] = useState<DataFrameAnalyticsListRow | undefined>();

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
      job_type: getAnalysisType(config.analysis) as DataFrameAnalysisConfigType,
      mode: DATA_FRAME_MODE.BATCH,
      state: stats.state,
      stats,
    };

    setExpandedRowItem(newExpandedRowItem);
  };

  useEffect(() => {
    fetchStats();
  }, [jobConfig?.id]);

  // Analytics section header items and content
  const analyticsSectionHeaderItems = getAnalyticsSectionHeaderItems(expandedRowItem);
  const analyticsSectionContent = (
    <>
      <EuiHorizontalRule size="full" margin="none" />
      {expandedRowItem === undefined && (
        <EuiText textAlign="center">
          <EuiSpacer size="l" />
          <EuiLoadingSpinner size="l" />
          <EuiSpacer size="l" />
        </EuiText>
      )}
      {(columnsWithCharts.length > 0 || searchQuery !== defaultSearchQuery) &&
        indexPattern !== undefined &&
        jobConfig !== undefined &&
        columnsWithCharts.length > 0 &&
        tableItems.length > 0 &&
        expandedRowItem !== undefined && <ExpandedRow item={expandedRowItem} />}
    </>
  );

  // Results section header items and content
  const resultsSectionHeaderItems = getResultsSectionHeaderItems(
    columnsWithCharts,
    tableItems,
    outlierData.rowCount,
    colorRange
  );
  const resultsSectionContent = (
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
  );

  return (
    <>
      {(columnsWithCharts.length > 0 || searchQuery !== defaultSearchQuery) &&
        indexPattern !== undefined && (
          <>
            <ExplorationQueryBar indexPattern={indexPattern} setSearchQuery={setSearchQuery} />
            <EuiSpacer size="m" />
          </>
        )}

      <ExpandableSection
        dataTestId="analysis"
        content={analyticsSectionContent}
        headerItems={analyticsSectionHeaderItems}
        isExpanded={false}
        title={
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.exploration.analysisSectionTitle"
            defaultMessage="Analysis"
          />
        }
      />

      <EuiSpacer size="m" />

      <ExpandableSection
        dataTestId="results"
        content={resultsSectionContent}
        headerItems={resultsSectionHeaderItems}
        title={
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.exploration.explorationTableTitle"
            defaultMessage="Results"
          />
        }
      />
      <EuiSpacer size="m" />
    </>
  );
});
