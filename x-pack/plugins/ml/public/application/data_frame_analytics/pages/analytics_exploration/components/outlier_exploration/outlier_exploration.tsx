/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState, FC } from 'react';
import moment from 'moment-timezone';
import {
  EuiCallOut,
  type EuiDataGridColumn,
  type EuiDataGridCellValueElementProps,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { isOutlierAnalysis, FEATURE_INFLUENCE } from '@kbn/ml-data-frame-analytics-utils';
import { getNestedProperty } from '@kbn/ml-nested-property';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { formatHumanReadableDateTimeSeconds } from '@kbn/ml-date-utils';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  getDataGridSchemasFromFieldTypes,
  getFeatureImportance,
  getTopClasses,
  UseIndexDataReturnType,
} from '@kbn/ml-data-grid';

import {
  sortExplorationResultsFields,
  DEFAULT_RESULTS_FIELD,
} from '@kbn/ml-data-frame-analytics-utils';

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
import { ExplorationQueryBarProps } from '../exploration_query_bar/exploration_query_bar';
import { IndexPatternPrompt } from '../index_pattern_prompt';
import { getIndexFields } from '../../../../common';

export type TableItem = Record<string, any>;

interface ExplorationProps {
  jobId: string;
}

export const OutlierExploration: FC<ExplorationProps> = React.memo(({ jobId }) => {
  const { indexPattern, indexPatternErrorMessage, jobConfig, needsDestIndexPattern } =
    useResultsViewConfig(jobId);
  const [pageUrlState, setPageUrlState] = useExplorationUrlState();
  const [searchQuery, setSearchQuery] =
    useState<estypes.QueryDslQueryContainer>(defaultSearchQuery);

  const columns = useMemo(() => {
    const newColumns: EuiDataGridColumn[] = [];
    const needsDestIndexFields =
      indexPattern !== undefined && indexPattern.title === jobConfig?.source.index[0];

    if (jobConfig !== undefined && indexPattern !== undefined) {
      const resultsField = jobConfig.dest.results_field;
      const { fieldTypes } = getIndexFields(jobConfig, needsDestIndexFields);
      newColumns.push(
        ...getDataGridSchemasFromFieldTypes(fieldTypes, resultsField!).sort((a: any, b: any) =>
          sortExplorationResultsFields(a.id, b.id, jobConfig)
        )
      );
    }

    return newColumns;
  }, [jobConfig, indexPattern]);

  const outlierData = useOutlierData(indexPattern, jobConfig, searchQuery, columns);
  const { columnsWithCharts, pagination, tableItems } = outlierData;
  const resultsField = jobConfig?.dest.results_field ?? '';
  const featureCount = getFeatureCount(resultsField, tableItems);
  const colorRange = useColorRange(COLOR_RANGE.BLUE, COLOR_RANGE_SCALE.INFLUENCER, featureCount);

  const renderCellValue = ({
    rowIndex,
    columnId,
    setCellProps,
  }: EuiDataGridCellValueElementProps): any => {
    const adjustedRowIndex = rowIndex - pagination.pageIndex * pagination.pageSize;
    const fullItem = tableItems[adjustedRowIndex];
    let backgroundColor: string | undefined;
    const featureNames = fullItem[`${resultsField}.${FEATURE_INFLUENCE}`];
    // column with feature values get color coded by its corresponding influencer value
    if (Array.isArray(featureNames)) {
      const featureForColumn = featureNames.find((feature) => columnId === feature.feature_name[0]);
      if (featureForColumn) {
        backgroundColor = colorRange(featureForColumn.influence[0]);
      }
    }
    // From EUI docs: Treated as React component allowing hooks, context, and other React concepts to be used.
    // This is the recommended use of setCellProps: https://github.com/elastic/eui/blob/main/src/components/datagrid/data_grid_types.ts#L521-L525
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      setCellProps({
        style: { backgroundColor: String(backgroundColor ?? '#ffffff') },
      });
    }, [backgroundColor, setCellProps]);

    if (fullItem === undefined) {
      return null;
    }

    if (indexPattern === undefined) {
      return null;
    }

    const field = indexPattern.fields.getByName(columnId);
    let fieldFormat: FieldFormat | undefined;

    if (field !== undefined) {
      fieldFormat = indexPattern.getFormatterForField(field);
    }

    function getCellValue(cId: string) {
      if (tableItems.hasOwnProperty(adjustedRowIndex)) {
        const item = tableItems[adjustedRowIndex];

        // Try if the field name is available as is.
        if (item.hasOwnProperty(cId)) {
          return item[cId];
        }

        // For classification and regression results, we need to treat some fields with a custom transform.
        if (cId === `${resultsField}.feature_importance`) {
          return getFeatureImportance(fullItem, resultsField ?? DEFAULT_RESULTS_FIELD);
        }

        if (cId === `${resultsField}.top_classes`) {
          return getTopClasses(fullItem, resultsField ?? DEFAULT_RESULTS_FIELD);
        }

        // Try if the field name is available as a nested field.
        return getNestedProperty(tableItems[adjustedRowIndex], cId, null);
      }

      return null;
    }

    const cellValue = getCellValue(columnId);

    if (typeof cellValue === 'object' && cellValue !== null) {
      return JSON.stringify(cellValue);
    }

    if (cellValue === undefined || cellValue === null) {
      return null;
    }

    if (fieldFormat !== undefined) {
      return fieldFormat.convert(cellValue, 'text');
    }

    if (typeof cellValue === 'string' || cellValue === null) {
      return cellValue;
    }

    if (field?.type === KBN_FIELD_TYPES.DATE) {
      return formatHumanReadableDateTimeSeconds(moment(cellValue).unix() * 1000);
    }

    if (typeof cellValue === 'boolean') {
      return cellValue ? 'true' : 'false';
    }

    return cellValue;
  };

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

  // Show the color range only if feature influence is enabled.
  const showColorRange =
    isOutlierAnalysis(jobConfig?.analysis) &&
    jobConfig?.analysis.outlier_detection.compute_feature_influence === true;

  // Identify if the results index has a legacy feature influence format.
  // If feature influence was enabled for the legacy job we'll show a callout
  // with some additional information for a workaround.
  const showLegacyFeatureInfluenceFormatCallout =
    !needsDestIndexPattern &&
    isOutlierAnalysis(jobConfig?.analysis) &&
    jobConfig?.analysis.outlier_detection.compute_feature_influence === true &&
    columnsWithCharts.findIndex((d) => d.id === `${resultsField}.${FEATURE_INFLUENCE}`) === -1;

  const scatterplotFieldOptions = useScatterplotFieldOptions(
    indexPattern,
    jobConfig?.analyzed_fields?.includes,
    jobConfig?.analyzed_fields?.excludes,
    resultsField
  );
  const destIndex = getDestinationIndex(jobConfig);

  if (indexPatternErrorMessage !== undefined) {
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
            {indexPatternErrorMessage}
            {needsDestIndexPattern ? (
              <IndexPatternPrompt destIndex={destIndex} color="text" />
            ) : null}
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
        indexPattern !== undefined && (
          <>
            <ExplorationQueryBar
              indexPattern={indexPattern}
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
        indexData={{ ...outlierData, renderCellValue } as UseIndexDataReturnType}
        indexPattern={indexPattern}
        jobConfig={jobConfig}
        needsDestIndexPattern={needsDestIndexPattern}
        searchQuery={searchQuery}
      />
    </>
  );
});
