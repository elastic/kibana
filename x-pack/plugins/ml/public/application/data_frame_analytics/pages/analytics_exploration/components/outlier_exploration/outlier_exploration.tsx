/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useState } from 'react';

import { EuiCallOut, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { isOutlierAnalysis, FEATURE_INFLUENCE } from '@kbn/ml-data-frame-analytics-utils';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  useColorRange,
  COLOR_RANGE,
  COLOR_RANGE_SCALE,
} from '../../../../../components/color_range_legend';
import { useScatterplotFieldOptions } from '../../../../../components/scatterplot_matrix';

import { defaultSearchQuery, useResultsViewConfig, getDestinationIndex } from '../../../../common';

import {
  ExpandableSectionSplom,
  ExpandableSectionAnalytics,
  ExpandableSectionResults,
} from '../expandable_section';
import { ExplorationQueryBar } from '../exploration_query_bar';

import { getFeatureCount } from './common';
import { useOutlierData } from './use_outlier_data';
import { useExplorationUrlState } from '../../hooks/use_exploration_url_state';
import type { ExplorationQueryBarProps } from '../exploration_query_bar/exploration_query_bar';
import { DataViewPrompt } from '../data_view_prompt';

export type TableItem = Record<string, any>;

interface ExplorationProps {
  jobId: string;
}

export const OutlierExploration: FC<ExplorationProps> = React.memo(({ jobId }) => {
  const { dataView, dataViewErrorMessage, jobConfig, needsDestDataView } =
    useResultsViewConfig(jobId);
  const [pageUrlState, setPageUrlState] = useExplorationUrlState();
  const [searchQuery, setSearchQuery] =
    useState<estypes.QueryDslQueryContainer>(defaultSearchQuery);
  const outlierData = useOutlierData(dataView, jobConfig, searchQuery);

  const searchQueryUpdateHandler: ExplorationQueryBarProps['setSearchQuery'] = useCallback(
    (update) => {
      if (update.query) {
        setSearchQuery(update.query);
      }
      if (update.queryString !== pageUrlState.queryText) {
        setPageUrlState({ queryText: update.queryString, queryLanguage: update.language });
      }
    },
    [pageUrlState, setPageUrlState]
  );

  const query: ExplorationQueryBarProps['query'] = {
    query: pageUrlState.queryText,
    language: pageUrlState.queryLanguage,
  };

  const { columnsWithCharts, tableItems } = outlierData;

  const resultsField = jobConfig?.dest.results_field ?? '';
  const featureCount = getFeatureCount(resultsField, tableItems);
  const colorRange = useColorRange(COLOR_RANGE.BLUE, COLOR_RANGE_SCALE.INFLUENCER, featureCount);

  // Show the color range only if feature influence is enabled.
  const showColorRange =
    isOutlierAnalysis(jobConfig?.analysis) &&
    jobConfig?.analysis.outlier_detection.compute_feature_influence === true;

  // Identify if the results index has a legacy feature influence format.
  // If feature influence was enabled for the legacy job we'll show a callout
  // with some additional information for a workaround.
  const showLegacyFeatureInfluenceFormatCallout =
    !needsDestDataView &&
    isOutlierAnalysis(jobConfig?.analysis) &&
    jobConfig?.analysis.outlier_detection.compute_feature_influence === true &&
    columnsWithCharts.findIndex((d) => d.id === `${resultsField}.${FEATURE_INFLUENCE}`) === -1;

  const scatterplotFieldOptions = useScatterplotFieldOptions(
    dataView,
    jobConfig?.analyzed_fields?.includes,
    jobConfig?.analyzed_fields?.excludes,
    resultsField
  );
  const destIndex = getDestinationIndex(jobConfig);

  if (dataViewErrorMessage !== undefined) {
    return (
      <EuiPanel grow={false} hasShadow={false} hasBorder>
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataframe.analytics.exploration.indexError', {
            defaultMessage: 'An error occurred loading the index data.',
          })}
          color="danger"
          iconType="cross"
        >
          <p>
            {dataViewErrorMessage}
            {needsDestDataView ? <DataViewPrompt destIndex={destIndex} color="text" /> : null}
          </p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  return (
    <>
      {typeof jobConfig?.description !== 'undefined' && jobConfig?.description !== '' && (
        <>
          <EuiText>{jobConfig?.description}</EuiText>
          <EuiSpacer size="m" />
        </>
      )}
      {(columnsWithCharts.length > 0 || searchQuery !== defaultSearchQuery) &&
        dataView !== undefined && (
          <>
            <ExplorationQueryBar
              dataView={dataView}
              setSearchQuery={searchQueryUpdateHandler}
              query={query}
            />
            <EuiSpacer size="m" />
          </>
        )}
      {typeof jobConfig?.id === 'string' && <ExpandableSectionAnalytics jobId={jobConfig?.id} />}
      {typeof jobConfig?.id === 'string' && scatterplotFieldOptions.length > 1 && (
        <ExpandableSectionSplom
          fields={scatterplotFieldOptions}
          index={jobConfig?.dest.index}
          resultsField={jobConfig?.dest.results_field}
          searchQuery={searchQuery}
          query={query}
        />
      )}
      {showLegacyFeatureInfluenceFormatCallout && (
        <>
          <EuiCallOut
            size="s"
            title={i18n.translate(
              'xpack.ml.dataframe.analytics.outlierExploration.legacyFeatureInfluenceFormatCalloutTitle',
              {
                defaultMessage:
                  'Color coded table cells based on feature influence are not available because the results index uses an unsupported legacy format. Please clone and rerun the job.',
              }
            )}
            iconType="pin"
          />
          <EuiSpacer size="m" />
        </>
      )}
      <ExpandableSectionResults
        colorRange={
          showColorRange && !showLegacyFeatureInfluenceFormatCallout ? colorRange : undefined
        }
        indexData={outlierData}
        dataView={dataView}
        jobConfig={jobConfig}
        needsDestDataView={needsDestDataView}
        searchQuery={searchQuery}
      />
    </>
  );
});
