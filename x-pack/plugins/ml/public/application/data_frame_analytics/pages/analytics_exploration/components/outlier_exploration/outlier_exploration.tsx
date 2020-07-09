/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';

import {
  useColorRange,
  COLOR_RANGE,
  COLOR_RANGE_SCALE,
} from '../../../../../components/color_range_legend';
import { ColorRangeLegend } from '../../../../../components/color_range_legend';
import { DataGrid } from '../../../../../components/data_grid';
import { SavedSearchQuery } from '../../../../../contexts/ml';
import { getToastNotifications } from '../../../../../util/dependency_cache';

import { defaultSearchQuery, useResultsViewConfig, INDEX_STATUS } from '../../../../common';

import { getTaskStateBadge } from '../../../analytics_management/components/analytics_list/use_columns';

import { ExplorationQueryBar } from '../exploration_query_bar';
import { ExplorationTitle } from '../exploration_title';
import { IndexPatternPrompt } from '../index_pattern_prompt';

import { getFeatureCount } from './common';
import { useOutlierData } from './use_outlier_data';

export type TableItem = Record<string, any>;

interface ExplorationProps {
  jobId: string;
}

export const OutlierExploration: FC<ExplorationProps> = React.memo(({ jobId }) => {
  const explorationTitle = i18n.translate('xpack.ml.dataframe.analytics.exploration.jobIdTitle', {
    defaultMessage: 'Outlier detection job ID {jobId}',
    values: { jobId },
  });

  const { indexPattern, jobConfig, jobStatus, needsDestIndexPattern } = useResultsViewConfig(jobId);
  const [searchQuery, setSearchQuery] = useState<SavedSearchQuery>(defaultSearchQuery);
  const outlierData = useOutlierData(indexPattern, jobConfig, searchQuery);

  const { columnsWithCharts, errorMessage, status, tableItems } = outlierData;

  // if it's a searchBar syntax error leave the table visible so they can try again
  if (status === INDEX_STATUS.ERROR && !errorMessage.includes('failed to create query')) {
    return (
      <EuiPanel grow={false}>
        <ExplorationTitle title={explorationTitle} />
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

  /* eslint-disable-next-line react-hooks/rules-of-hooks */
  const colorRange = useColorRange(
    COLOR_RANGE.BLUE,
    COLOR_RANGE_SCALE.INFLUENCER,
    jobConfig !== undefined ? getFeatureCount(jobConfig.dest.results_field, tableItems) : 1
  );

  return (
    <EuiPanel data-test-subj="mlDFAnalyticsOutlierExplorationTablePanel">
      {jobConfig !== undefined && needsDestIndexPattern && (
        <IndexPatternPrompt destIndex={jobConfig.dest.index} />
      )}
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        gutterSize="s"
      >
        <EuiFlexItem grow={false}>
          <ExplorationTitle title={explorationTitle} />
        </EuiFlexItem>
        {jobStatus !== undefined && (
          <EuiFlexItem grow={false}>
            <span>{getTaskStateBadge(jobStatus)}</span>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      {(columnsWithCharts.length > 0 || searchQuery !== defaultSearchQuery) &&
        indexPattern !== undefined && (
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
  );
});
