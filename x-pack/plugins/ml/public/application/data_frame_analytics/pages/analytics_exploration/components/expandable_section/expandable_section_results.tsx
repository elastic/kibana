/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiDataGridColumn, EuiSpacer, EuiText } from '@elastic/eui';

import type { DataView } from '../../../../../../../../../../src/plugins/data_views/public';

import {
  isClassificationAnalysis,
  isRegressionAnalysis,
} from '../../../../../../../common/util/analytics_utils';
import { ES_CLIENT_TOTAL_HITS_RELATION } from '../../../../../../../common/types/es_client';

import { getToastNotifications } from '../../../../../util/dependency_cache';
import { useColorRange, ColorRangeLegend } from '../../../../../components/color_range_legend';
import {
  DataGrid,
  RowCountRelation,
  UseIndexDataReturnType,
} from '../../../../../components/data_grid';
import { SavedSearchQuery } from '../../../../../contexts/ml';

import {
  defaultSearchQuery,
  DataFrameAnalyticsConfig,
  INDEX_STATUS,
  SEARCH_SIZE,
  getAnalysisType,
} from '../../../../common';

import {
  ExpandableSection,
  ExpandableSectionProps,
  HEADER_ITEMS_LOADING,
} from '../expandable_section';
import { IndexPatternPrompt } from '../index_pattern_prompt';

const showingDocs = i18n.translate(
  'xpack.ml.dataframe.analytics.explorationResults.documentsShownHelpText',
  {
    defaultMessage: 'Showing documents for which predictions exist',
  }
);

const showingFirstDocs = i18n.translate(
  'xpack.ml.dataframe.analytics.explorationResults.firstDocumentsShownHelpText',
  {
    defaultMessage: 'Showing first {searchSize} documents for which predictions exist',
    values: { searchSize: SEARCH_SIZE },
  }
);

const getResultsSectionHeaderItems = (
  columnsWithCharts: EuiDataGridColumn[],
  status: INDEX_STATUS,
  tableItems: Array<Record<string, any>>,
  rowCount: number,
  rowCountRelation: RowCountRelation,
  colorRange?: ReturnType<typeof useColorRange>
): ExpandableSectionProps['headerItems'] => {
  return columnsWithCharts.length > 0 && (tableItems.length > 0 || status === INDEX_STATUS.LOADED)
    ? [
        {
          id: 'explorationTableTotalDocs',
          label: (
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.exploration.explorationTableTotalDocsLabel"
              defaultMessage="Total docs"
            />
          ),
          value: `${rowCountRelation === ES_CLIENT_TOTAL_HITS_RELATION.GTE ? '>' : ''}${rowCount}`,
        },
        ...(colorRange !== undefined
          ? [
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
          : []),
      ]
    : HEADER_ITEMS_LOADING;
};

interface ExpandableSectionResultsProps {
  colorRange?: ReturnType<typeof useColorRange>;
  indexData: UseIndexDataReturnType;
  indexPattern?: DataView;
  jobConfig?: DataFrameAnalyticsConfig;
  needsDestIndexPattern: boolean;
  searchQuery: SavedSearchQuery;
}

export const ExpandableSectionResults: FC<ExpandableSectionResultsProps> = ({
  colorRange,
  indexData,
  indexPattern,
  jobConfig,
  needsDestIndexPattern,
  searchQuery,
}) => {
  const { columnsWithCharts, status, tableItems } = indexData;

  // Results section header items and content
  const resultsSectionHeaderItems = getResultsSectionHeaderItems(
    columnsWithCharts,
    status,
    tableItems,
    indexData.rowCount,
    indexData.rowCountRelation,
    colorRange
  );
  const analysisType =
    jobConfig && jobConfig.analysis ? getAnalysisType(jobConfig.analysis) : undefined;
  const resultsSectionContent = (
    <>
      {jobConfig !== undefined && needsDestIndexPattern && (
        <div className="mlExpandableSection-contentPadding">
          <IndexPatternPrompt destIndex={jobConfig.dest.index} />
        </div>
      )}
      {jobConfig !== undefined &&
        (isRegressionAnalysis(jobConfig.analysis) ||
          isClassificationAnalysis(jobConfig.analysis)) && (
          <EuiText size="xs" color="subdued" className="mlExpandableSection-contentPadding">
            {tableItems.length === SEARCH_SIZE ? showingFirstDocs : showingDocs}
          </EuiText>
        )}
      {(columnsWithCharts.length > 0 || searchQuery !== defaultSearchQuery) &&
        indexPattern !== undefined && (
          <>
            {columnsWithCharts.length > 0 &&
              (tableItems.length > 0 || status === INDEX_STATUS.LOADED) && (
                <DataGrid
                  {...indexData}
                  analysisType={analysisType}
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
      <ExpandableSection
        urlStateKey={'results'}
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
};
