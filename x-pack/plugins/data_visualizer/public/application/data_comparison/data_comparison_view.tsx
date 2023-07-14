/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode, useCallback, useMemo, useState } from 'react';
import {
  AreaSeries,
  Chart,
  CurveType,
  Settings,
  BarSeries,
  ScaleType,
  Position,
  Axis,
  Tooltip,
} from '@elastic/charts';
import {
  EuiButtonIcon,
  EuiBasicTableColumn,
  EuiTableFieldDataColumnType,
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiFormRow,
  EuiScreenReaderOnly,
  EuiSwitch,
  EuiInMemoryTable,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { WindowParameters } from '@kbn/aiops-utils';
import type { SeriesColorAccessor } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
import { i18n } from '@kbn/i18n';
import type { Query } from '@kbn/es-query';
import { ProgressControls } from '@kbn/aiops-components';
import { isEqual } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSwitchEvent } from '@elastic/eui/src/components/form/switch/switch';
import { useTableState, UseTableState } from '@kbn/ml-in-memory-table';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { useCurrentEuiTheme } from '../common/hooks/use_current_eui_theme';
import { DataComparisonChartTooltipBody } from './data_comparison_chart_tooltip_body';
import { getDataComparisonType, useFetchDataComparisonResult } from './use_data_drift_result';
import {
  DATA_COMPARISON_TYPE,
  DATA_COMPARISON_TYPE_LABEL,
  COMPARISON_LABEL,
  REFERENCE_LABEL,
} from './constants';
import type {
  Histogram,
  ComparisionHistogram,
  Feature,
  TimeRange,
  DataComparisonField,
} from './types';

const formatSignificanceLevel = (significanceLevel: number) => {
  if (typeof significanceLevel !== 'number' || isNaN(significanceLevel)) return '';
  if (significanceLevel < 1e-6) {
    return <span>&lt; 0.000001</span>;
  } else if (significanceLevel < 0.01) {
    return significanceLevel.toExponential(0);
  } else {
    return significanceLevel.toFixed(2);
  }
};

export const DataComparisonDisbutrionChart = ({
  data,
  color,
  fieldType,
  name,
}: {
  data: Histogram[];
  name: string;
  color?: SeriesColorAccessor;
  fieldType?: DataComparisonField['type'];
}) => {
  return (
    <Chart>
      <Settings />
      <BarSeries
        id={`${name}-distr-viz`}
        name={name}
        xScaleType={
          fieldType === DATA_COMPARISON_TYPE.NUMERIC ? ScaleType.Linear : ScaleType.Ordinal
        }
        yScaleType={ScaleType.Linear}
        xAccessor="key"
        yAccessors={['percentage']}
        data={data}
        color={color}
      />
    </Chart>
  );
};

const OverlapDistributionComparison = ({
  data,
  colors,
  fieldType,
  fieldName,
}: {
  data: ComparisionHistogram[];
  colors: { referenceColor: string; productionColor: string };
  fieldType?: DataComparisonField['type'];
  fieldName?: DataComparisonField['field'];
}) => {
  return (
    <Chart>
      <Tooltip body={DataComparisonChartTooltipBody} />

      <Settings showLegend={false} />
      <AreaSeries
        id="dataVisualizer.overlapDistributionComparisonChart"
        name={i18n.translate(
          'xpack.dataVisualizer.dataComparison.distributionComparisonChartName',
          {
            defaultMessage:
              'Distribution comparison of reference and production data for {fieldName}',
            values: { fieldName },
          }
        )}
        xScaleType={
          fieldType === DATA_COMPARISON_TYPE.NUMERIC ? ScaleType.Linear : ScaleType.Ordinal
        }
        yScaleType={ScaleType.Linear}
        xAccessor="key"
        yAccessors={['percentage']}
        splitSeriesAccessors={['g']}
        data={data}
        curve={CurveType.CURVE_STEP_AFTER}
        color={(identifier) => {
          const key = identifier.seriesKeys[0];
          return key === COMPARISON_LABEL ? colors.productionColor : colors.referenceColor;
        }}
      />
    </Chart>
  );
};

const DataComparisonChart = ({
  featureName,
  fieldType,
  data,
  colors,
}: {
  featureName: string;
  fieldType: string;
  data: ComparisionHistogram[];
  colors: { referenceColor: string; productionColor: string };
}) => {
  return (
    <Chart>
      <Tooltip body={DataComparisonChartTooltipBody} />
      <Settings />
      <Axis id="bottom" position={Position.Bottom} title="Feature values" />
      <Axis
        id="left2"
        title="Frequency"
        position={Position.Left}
        tickFormat={(d: any) => Number(d).toFixed(2)}
      />
      <BarSeries
        id="data-drift-viz"
        name={featureName}
        xScaleType={
          fieldType === DATA_COMPARISON_TYPE.NUMERIC ? ScaleType.Linear : ScaleType.Ordinal
        }
        yScaleType={ScaleType.Linear}
        xAccessor="key"
        yAccessors={['percentage']}
        splitSeriesAccessors={['g']}
        data={data}
        color={(identifier) => {
          const key = identifier.seriesKeys[0];
          return key === 'Production' ? colors.productionColor : colors.referenceColor;
        }}
      />
    </Chart>
  );
};

const dataComparisonedYesLabel = i18n.translate(
  'xpack.dataVisualizer.dataComparison.fieldTypeYesLabel',
  {
    defaultMessage: 'Yes',
  }
);
const dataComparisonedNoLabel = i18n.translate(
  'xpack.dataVisualizer.dataComparison.driftDetectedNoLabel',
  {
    defaultMessage: 'No',
  }
);

const showOnlyDriftedFieldsOptionLabel = i18n.translate(
  'xpack.dataVisualizer.dataComparison.showOnlyDriftedFieldsOptionLabel',
  { defaultMessage: 'Show only fields with drifted data' }
);

interface DataComparisonViewProps {
  windowParameters?: WindowParameters;
  dataView: DataView;
  searchString: Query['query'];
  searchQuery: Query['query'];
  searchQueryLanguage: SearchQueryLanguage;
  isBrushCleared: boolean;
  runAnalysisDisabled?: boolean;
  onReset: () => void;
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
}: DataComparisonViewProps) => {
  const [showDataComparisonedOnly, setShowDataComparisonedOnly] = useState(false);

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

  const updateFieldsAndTime = useCallback(() => {
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
  }, [dataView, windowParameters]);
  const result = useFetchDataComparisonResult({
    ...fetchInfo,
    searchString,
    searchQueryLanguage,
    searchQuery,
  });

  const filteredData = useMemo(() => {
    if (!result?.data) return [];

    switch (showDataComparisonedOnly) {
      case true:
        return result.data.filter((d) => d.driftDetected === true);
      default:
        return result.data;
    }
  }, [result.data, showDataComparisonedOnly]);

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

  const onShowDataComparisonedOnlyToggle = (e: EuiSwitchEvent) => {
    setShowDataComparisonedOnly(e.target.checked);
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
            defaultMessage="Select a time range for reference and production data in the histogram chart to compare data distribution."
          />
        </h2>
      }
      titleSize="xs"
      body={
        <p>
          <FormattedMessage
            id="xpack.dataVisualizer.dataComparison.emptyPromptBody"
            defaultMessage="The Data Comparison Viewer visualizes changes in the model input data, which can lead to model performance degradation over time. Detecting data drifts enables you to identify potential performance issues.
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
        onRefresh={updateFieldsAndTime}
        onCancel={() => {}}
        shouldRerunAnalysis={shouldRerunAnalysis}
        runAnalysisDisabled={!dataView || !windowParameters}
      >
        <EuiFlexItem grow={false}>
          <EuiFormRow display="columnCompressedSwitch">
            <EuiSwitch
              label={showOnlyDriftedFieldsOptionLabel}
              aria-label={showOnlyDriftedFieldsOptionLabel}
              checked={showDataComparisonedOnly}
              onChange={onShowDataComparisonedOnlyToggle}
              compressed
            />
          </EuiFormRow>
        </EuiFlexItem>
      </ProgressControls>
      {result.error ? <EuiEmptyPrompt color="danger" body={<p>{result.error}</p>} /> : null}

      <DataComparisonOverviewTable
        data={filteredData}
        onTableChange={onTableChange}
        pagination={pagination}
        sorting={sorting}
        setPageIndex={setPageIndex}
      />
    </div>
  );
};

export const DataComparisonOverviewTable = ({
  data,
  onTableChange,
  pagination,
  sorting,
}: {
  data: Feature[];
} & UseTableState<Feature>) => {
  const euiTheme = useCurrentEuiTheme();
  const colors = {
    referenceColor: euiTheme.euiColorVis2,
    productionColor: euiTheme.euiColorVis1,
  };
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const columns: Array<EuiBasicTableColumn<Feature>> = [
    {
      align: 'left',
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>Expand rows</span>
        </EuiScreenReaderOnly>
      ),
      render: (item: Feature) => {
        const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

        return (
          <EuiButtonIcon
            onClick={() => toggleDetails(item)}
            aria-label={itemIdToExpandedRowMapValues[item.featureName] ? 'Collapse' : 'Expand'}
            iconType={itemIdToExpandedRowMapValues[item.featureName] ? 'arrowDown' : 'arrowRight'}
          />
        );
      },
    },

    {
      field: 'featureName',
      name: i18n.translate('xpack.dataVisualizer.dataComparison.fieldNameLabel', {
        defaultMessage: 'Field name',
      }),
      'data-test-subj': 'mlDataComparisonOverviewTableFeatureName',
      sortable: true,
      textOnly: true,
    },
    {
      field: 'fieldType',
      name: i18n.translate('xpack.dataVisualizer.dataComparison.fieldTypeLabel', {
        defaultMessage: 'Field type',
      }),
      'data-test-subj': 'mlDataComparisonOverviewTableFeatureType',
      sortable: true,
      textOnly: true,
      render: (fieldType: DataComparisonField['type']) => {
        return <span>{DATA_COMPARISON_TYPE_LABEL[fieldType]}</span>;
      },
    },
    {
      field: 'driftDetected',
      name: i18n.translate('xpack.dataVisualizer.dataComparison.driftDetectedLabel', {
        defaultMessage: 'Drift detected',
      }),
      'data-test-subj': 'mlDataComparisonOverviewTableDriftDetected',
      sortable: true,
      textOnly: true,
      render: (driftDetected: boolean) => {
        return <span>{driftDetected ? dataComparisonedYesLabel : dataComparisonedNoLabel}</span>;
      },
    },
    {
      field: 'similarityTestPValue',
      name: 'Similarity test p-value',
      'data-test-subj': 'mlDataComparisonOverviewTableSimilarityTestPValue',
      sortable: true,
      textOnly: true,
      render: (similarityTestPValue: number, feature: Feature) => {
        return <span>{formatSignificanceLevel(similarityTestPValue)}</span>;
      },
    },
    {
      field: 'referenceHistogram',
      name: 'Reference distribution',
      'data-test-subj': 'mlDataComparisonOverviewTableReferenceDistribution',
      sortable: false,
      render: (referenceHistogram: Feature['referenceHistogram'], item) => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <DataComparisonDisbutrionChart
              fieldType={item.fieldType}
              data={referenceHistogram}
              color={colors.referenceColor}
              name={i18n.translate(
                'xpack.dataVisualizer.dataComparison.dataComparisonDistributionLabel',
                {
                  defaultMessage: '{label} distribution',
                  values: { label: REFERENCE_LABEL },
                }
              )}
            />
          </div>
        );
      },
    },
    {
      field: 'productionHistogram',
      name: 'Production distribution',
      'data-test-subj': 'mlDataComparisonOverviewTableDataComparisonDisbutrionChart',
      sortable: false,
      render: (productionDistribution: Feature['productionHistogram'], item) => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <DataComparisonDisbutrionChart
              fieldType={item.fieldType}
              data={productionDistribution}
              color={colors.productionColor}
              name={i18n.translate(
                'xpack.dataVisualizer.dataComparison.dataComparisonDistributionLabel',
                {
                  defaultMessage: '{label} distribution',
                  values: { label: COMPARISON_LABEL },
                }
              )}
            />
          </div>
        );
      },
    },
    {
      field: 'comparisonDistribution',
      name: 'Comparison',
      'data-test-subj': 'mlDataComparisonOverviewTableDataComparisonDisbutrionChart',
      sortable: false,
      render: (comparisonDistribution: Feature['comparisonDistribution'], item) => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <OverlapDistributionComparison
              fieldName={item.featureName}
              fieldType={item.fieldType}
              data={comparisonDistribution}
              colors={colors}
            />
          </div>
        );
      },
    },
  ];

  const getRowProps = (item: Feature) => {
    return {
      'data-test-subj': `mlDataComparisonOverviewTableRow row-${item.featureName}`,
      className: 'mlDataComparisonOverviewTableRow',
      onClick: () => {},
    };
  };

  const getCellProps = (item: Feature, column: EuiTableFieldDataColumnType<Feature>) => {
    const { field } = column;
    return {
      className: 'mlDataComparisonOverviewTableCell',
      'data-test-subj': `mlDataComparisonOverviewTableCell row-${item.featureName}-column-${String(
        field
      )}`,
      textOnly: true,
    };
  };

  const toggleDetails = (item: Feature) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

    if (itemIdToExpandedRowMapValues[item.featureName]) {
      delete itemIdToExpandedRowMapValues[item.featureName];
    } else {
      const { featureName, comparisonDistribution } = item;
      itemIdToExpandedRowMapValues[item.featureName] = (
        <div css={{ width: '100%', height: 200 }}>
          <DataComparisonChart
            featureName={featureName}
            fieldType={item.fieldType}
            data={comparisonDistribution}
            colors={colors}
          />
        </div>
      );
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  return (
    <EuiInMemoryTable<Feature>
      tableCaption={i18n.translate(
        'xpack.dataVisualizer.dataComparison.dataComparisonTableCaption',
        {
          defaultMessage: 'Data comparison overview',
        }
      )}
      items={data}
      rowHeader="featureName"
      columns={columns}
      rowProps={getRowProps}
      cellProps={getCellProps}
      itemId="featureName"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      isExpandable={true}
      sorting={sorting}
      onChange={onTableChange}
      pagination={pagination}
    />
  );
};
