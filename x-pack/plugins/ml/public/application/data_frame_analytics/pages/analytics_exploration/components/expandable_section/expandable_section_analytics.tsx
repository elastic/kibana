/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, FC } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { EuiHorizontalRule, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';

import type { DataFrameAnalysisConfigType } from '../../../../../../../common/types/data_frame_analytics';

import { ml } from '../../../../../services/ml_api_service';

import { getAnalysisType } from '../../../../common';

import { isGetDataFrameAnalyticsStatsResponseOk } from '../../../analytics_management/services/analytics_service/get_analytics';
import {
  DataFrameAnalyticsListRow,
  DATA_FRAME_MODE,
} from '../../../analytics_management/components/analytics_list/common';
import { ExpandedRow } from '../../../analytics_management/components/analytics_list/expanded_row';

import {
  ExpandableSection,
  ExpandableSectionProps,
  HEADER_ITEMS_LOADING,
} from './expandable_section';

const getAnalyticsSectionHeaderItems = (
  expandedRowItem: DataFrameAnalyticsListRow | undefined
): ExpandableSectionProps['headerItems'] => {
  if (expandedRowItem === undefined) {
    return HEADER_ITEMS_LOADING;
  }

  const sourceIndex = Array.isArray(expandedRowItem.config.source.index)
    ? expandedRowItem.config.source.index.join()
    : expandedRowItem.config.source.index;

  return [
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
      value: sourceIndex,
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
  ];
};

interface ExpandableSectionAnalyticsProps {
  jobId: string;
}

export const ExpandableSectionAnalytics: FC<ExpandableSectionAnalyticsProps> = ({ jobId }) => {
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
  }, [jobId]);

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
      {expandedRowItem !== undefined && <ExpandedRow item={expandedRowItem} />}
    </>
  );

  return (
    <>
      <ExpandableSection
        dataTestId="analysis"
        content={analyticsSectionContent}
        headerItems={analyticsSectionHeaderItems}
        urlStateKey={'analysis'}
        title={
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.exploration.analysisSectionTitle"
            defaultMessage="Analysis"
          />
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
