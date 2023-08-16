/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { EuiEmptyPrompt, EuiFlexItem, EuiFormRow, EuiSwitch, EuiSpacer } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { WindowParameters } from '@kbn/aiops-utils';
import { i18n } from '@kbn/i18n';
import type { Query } from '@kbn/es-query';
import { ProgressControls } from '@kbn/aiops-components';
import { isEqual } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSwitchEvent } from '@elastic/eui/src/components/form/switch/switch';
import { useTableState } from '@kbn/ml-in-memory-table';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { RandomSampler } from '@kbn/ml-random-sampler-utils';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { kbnTypeToSupportedType } from '../common/util/field_types_utils';
import { getDataComparisonType, useFetchDataComparisonResult } from './use_data_drift_result';
import type { DataComparisonField, Feature, TimeRange } from './types';
import { DataComparisonOverviewTable } from './data_comparison_overview_table';

const showOnlyDriftedFieldsOptionLabel = i18n.translate(
  'xpack.dataVisualizer.dataComparison.showOnlyDriftedFieldsOptionLabel',
  { defaultMessage: 'Show only fields with drifted data' }
);

interface DataComparisonViewProps {
  windowParameters?: WindowParameters;
  dataView: DataView;
  searchString: Query['query'];
  searchQuery: QueryDslQueryContainer;
  searchQueryLanguage: SearchQueryLanguage;
  isBrushCleared: boolean;
  runAnalysisDisabled?: boolean;
  onReset: () => void;
  lastRefresh: number;
  forceRefresh: () => void;
  randomSampler: RandomSampler;
}
// Data drift view
export const DataComparisonView = ({
  windowParameters,
  dataView,
  searchString,
  searchQuery,
  searchQueryLanguage,
  onReset,
  isBrushCleared,
  lastRefresh,
  forceRefresh,
  randomSampler,
}: DataComparisonViewProps) => {
  const [showDataComparisonOnly, setShowDataComparisonOnly] = useState(false);

  const [currentAnalysisWindowParameters, setCurrentAnalysisWindowParameters] = useState<
    WindowParameters | undefined
  >(windowParameters);

  const [fetchInfo, setFetchIno] = useState<
    | {
        fields: DataComparisonField[];
        currentDataView: DataView;
        timeRanges?: { reference: TimeRange; production: TimeRange };
      }
    | undefined
  >();

  const onRefresh = useCallback(() => {
    setCurrentAnalysisWindowParameters(windowParameters);
    const mergedFields: DataComparisonField[] = [];
    if (dataView) {
      mergedFields.push(
        ...dataView.fields
          .filter(
            (f) =>
              f.aggregatable === true &&
              // @ts-ignore metadata does exist
              f.spec.metadata_field! !== true &&
              getDataComparisonType(f.type) !== 'unsupported' &&
              mergedFields.findIndex((merged) => merged.field === f.name) === -1
          )
          .map((f) => ({
            field: f.name,
            type: getDataComparisonType(f.type),
            secondaryType: kbnTypeToSupportedType(f),
            displayName: f.displayName,
          }))
      );
    }
    setFetchIno({
      fields: mergedFields,
      currentDataView: dataView,
      ...(windowParameters
        ? {
            timeRanges: {
              reference: {
                start: windowParameters.baselineMin,
                end: windowParameters.baselineMax,
              },
              production: {
                start: windowParameters.deviationMin,
                end: windowParameters.deviationMax,
              },
            },
          }
        : {}),
    });
    if (forceRefresh) {
      forceRefresh();
    }
  }, [dataView, windowParameters, forceRefresh]);

  const { result, cancelRequest } = useFetchDataComparisonResult({
    ...fetchInfo,
    lastRefresh,
    randomSampler,
    searchString,
    searchQueryLanguage,
    searchQuery,
  });

  const filteredData = useMemo(() => {
    if (!result?.data) return [];

    switch (showDataComparisonOnly) {
      case true:
        return result.data.filter((d) => d.driftDetected === true);
      default:
        return result.data;
    }
  }, [result.data, showDataComparisonOnly]);

  const { onTableChange, pagination, sorting, setPageIndex } = useTableState<Feature>(
    filteredData,
    'driftDetected',
    'desc'
  );

  const shouldRerunAnalysis = useMemo(
    () =>
      currentAnalysisWindowParameters !== undefined &&
      !isEqual(currentAnalysisWindowParameters, windowParameters),
    [currentAnalysisWindowParameters, windowParameters]
  );

  const onShowDataComparisonOnlyToggle = (e: EuiSwitchEvent) => {
    setShowDataComparisonOnly(e.target.checked);
    setPageIndex(0);
  };

  return windowParameters === undefined ? (
    <EuiEmptyPrompt
      color="subdued"
      hasShadow={false}
      hasBorder={false}
      css={{ minWidth: '100%' }}
      title={
        <h2>
          <FormattedMessage
            id="xpack.dataVisualizer.dataComparison.emptyPromptTitle"
            defaultMessage="Select a time range for reference and comparison data in the histogram chart to compare data distribution."
          />
        </h2>
      }
      titleSize="xs"
      body={
        <p>
          <FormattedMessage
            id="xpack.dataVisualizer.dataComparison.emptyPromptBody"
            defaultMessage="The Data Comparison View compares the statistical properties of features in the 'reference' and 'comparison' data sets.
"
          />
        </p>
      }
      data-test-subj="dataVisualizerNoWindowParametersEmptyPrompt"
    />
  ) : (
    <div>
      <ProgressControls
        isBrushCleared={isBrushCleared}
        onReset={onReset}
        progress={result.loaded}
        progressMessage={result.progressMessage ?? ''}
        isRunning={result.loaded > 0 && result.loaded < 1}
        onRefresh={onRefresh}
        onCancel={cancelRequest}
        shouldRerunAnalysis={shouldRerunAnalysis}
        runAnalysisDisabled={!dataView || !windowParameters}
      >
        <EuiFlexItem grow={false}>
          <EuiFormRow display="columnCompressedSwitch">
            <EuiSwitch
              label={showOnlyDriftedFieldsOptionLabel}
              aria-label={showOnlyDriftedFieldsOptionLabel}
              checked={showDataComparisonOnly}
              onChange={onShowDataComparisonOnlyToggle}
              compressed
            />
          </EuiFormRow>
        </EuiFlexItem>
      </ProgressControls>
      <EuiSpacer size="m" />

      {result.error ? (
        <EuiEmptyPrompt
          css={{ minWidth: '100%' }}
          color="danger"
          title={<h2>{result.error}</h2>}
          titleSize="xs"
          body={<span>{result.errorBody}</span>}
        />
      ) : (
        <DataComparisonOverviewTable
          data={filteredData}
          onTableChange={onTableChange}
          pagination={pagination}
          sorting={sorting}
          setPageIndex={setPageIndex}
          status={result.status}
        />
      )}
    </div>
  );
};
