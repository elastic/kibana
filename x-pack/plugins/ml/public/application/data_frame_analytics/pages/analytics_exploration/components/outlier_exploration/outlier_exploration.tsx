/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, FC } from 'react';

import { EuiSpacer, EuiText } from '@elastic/eui';

import {
  useColorRange,
  COLOR_RANGE,
  COLOR_RANGE_SCALE,
} from '../../../../../components/color_range_legend';
import { SavedSearchQuery } from '../../../../../contexts/ml';

import { defaultSearchQuery, useResultsViewConfig } from '../../../../common';

import { ExpandableSectionAnalytics, ExpandableSectionResults } from '../expandable_section';
import { ExplorationQueryBar } from '../exploration_query_bar';

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

  return (
    <>
      {typeof jobConfig?.description !== 'undefined' && (
        <>
          <EuiText>{jobConfig?.description}</EuiText>
          <EuiSpacer size="m" />
        </>
      )}
      {(columnsWithCharts.length > 0 || searchQuery !== defaultSearchQuery) &&
        indexPattern !== undefined && (
          <>
            <ExplorationQueryBar indexPattern={indexPattern} setSearchQuery={setSearchQuery} />
            <EuiSpacer size="m" />
          </>
        )}
      {typeof jobConfig?.id === 'string' && <ExpandableSectionAnalytics jobId={jobConfig?.id} />}
      <ExpandableSectionResults
        colorRange={colorRange}
        indexData={outlierData}
        indexPattern={indexPattern}
        jobConfig={jobConfig}
        needsDestIndexPattern={needsDestIndexPattern}
        searchQuery={searchQuery}
      />
    </>
  );
});
