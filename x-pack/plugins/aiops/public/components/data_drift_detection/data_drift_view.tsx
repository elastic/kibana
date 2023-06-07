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
  Comparators,
  EuiButtonIcon,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiTableFieldDataColumnType,
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiFormRow,
  EuiScreenReaderOnly,
  EuiSwitch,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { WindowParameters } from '@kbn/aiops-utils';
import { SeriesColorAccessor } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
import { i18n } from '@kbn/i18n';
import { Query } from '@kbn/es-query';
import { ProgressControls } from '@kbn/aiops-components';
import { isEqual } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSwitchEvent } from '@elastic/eui/src/components/form/switch/switch';
import { UseTableState, useTableState } from '../log_categorization/category_table/use_table_state';
import { SearchQueryLanguage } from '../../application/utils/search_utils';
import { useEuiTheme } from '../../hooks/use_eui_theme';
import { getDataDriftType, useFetchDataDriftResult } from './use_data_drift_result';
import { DATA_DRIFT_TYPE, DATA_DRIFT_TYPE_LABEL, PRODUCTION_LABEL } from './constants';
import { Histogram, ComparisionHistogram, Feature, DataDriftField, TimeRange } from './types';
import { DataDriftChartTooltipBody } from './data_drift_chart_tooltip_body';

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

// Reference data numeric distribution
export const ReferenceDistribution = ({
  data,
  color,
  fieldType,
}: {
  data: Histogram[];
  color?: SeriesColorAccessor;
  fieldType?: DataDriftField['type'];
}) => {
  return (
    <Chart>
      <Settings />
      <BarSeries
        id="reference-distr-viz"
        name="Reference distribution"
        xScaleType={fieldType === DATA_DRIFT_TYPE.NUMERIC ? ScaleType.Linear : ScaleType.Ordinal}
        yScaleType={ScaleType.Linear}
        xAccessor="key"
        yAccessors={['percentage']}
        data={data}
        color={color}
      />
    </Chart>
  );
};

// Production data numeric distribution
export const ProductionDistribution = ({
  data,
  color,
  fieldType,
}: {
  data: Histogram[];
  color?: SeriesColorAccessor;
  fieldType?: DataDriftField['type'];
}) => {
  return (
    <Chart>
      <Settings />
      <BarSeries
        id="production-distr-viz"
        name="Production distribution"
        xScaleType={fieldType === DATA_DRIFT_TYPE.NUMERIC ? ScaleType.Linear : ScaleType.Ordinal}
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
  fieldType?: DataDriftField['type'];
  fieldName?: DataDriftField['field'];
}) => {
  return (
    <Chart>
      <Tooltip body={DataDriftChartTooltipBody} />

      <Settings showLegend={false} />
      <AreaSeries
        id="aiops.overlapDistributionComparisonChart"
        name={i18n.translate('xpack.aiops.dataDrift.distributionComparisonChartName', {
          defaultMessage:
            'Distribution comparison of reference and production data for {fieldName}',
          values: { fieldName },
        })}
        xScaleType={fieldType === DATA_DRIFT_TYPE.NUMERIC ? ScaleType.Linear : ScaleType.Ordinal}
        yScaleType={ScaleType.Linear}
        xAccessor="key"
        yAccessors={['percentage']}
        splitSeriesAccessors={['g']}
        data={data}
        curve={CurveType.CURVE_STEP_AFTER}
        color={(identifier) => {
          const key = identifier.seriesKeys[0];
          return key === PRODUCTION_LABEL ? colors.productionColor : colors.referenceColor;
        }}
      />
    </Chart>
  );
};

const DataDriftChart = ({
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
      <Tooltip body={DataDriftChartTooltipBody} />
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
        xScaleType={fieldType === DATA_DRIFT_TYPE.NUMERIC ? ScaleType.Linear : ScaleType.Ordinal}
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

const dataDriftedYesLabel = i18n.translate('xpack.aiops.dataDrift.fieldTypeYesLabel', {
  defaultMessage: 'Yes',
});
const dataDriftedNoLabel = i18n.translate('xpack.aiops.dataDrift.driftDetectedNoLabel', {
  defaultMessage: 'No',
});

const showOnlyDriftedFieldsOptionLabel = i18n.translate(
  'xpack.aiops.dataDrift.showOnlyDriftedFieldsOptionLabel',
  { defaultMessage: 'Show only fields with data drifted' }
);
// Data drift view
export const DataDriftView = ({
  windowParameters,
  dataView,
  searchString,
  searchQuery,
  searchQueryLanguage,
}: {
  windowParameters?: WindowParameters;
  dataView: DataView;
  searchString: Query['query'];
  searchQuery: Query['query'];
  searchQueryLanguage: SearchQueryLanguage;
}) => {
  const [showDataDriftedOnly, setShowDataDriftedOnly] = useState(false);

  const [currentAnalysisWindowParameters, setCurrentAnalysisWindowParameters] = useState<
    WindowParameters | undefined
  >(windowParameters);

  const [fetchInfo, setFetchIno] = useState<
    | {
        fields: DataDriftField[];
        currentDataView: DataView;
        timeRanges?: { reference: TimeRange; production: TimeRange };
      }
    | undefined
  >();

  const updateFieldsAndTime = useCallback(() => {
    setCurrentAnalysisWindowParameters(windowParameters);
    const mergedFields: DataDriftField[] = [];
    if (dataView) {
      mergedFields.push(
        ...dataView.fields
          .filter(
            (f) =>
              f.aggregatable === true &&
              // @ts-ignore metadata does exist
              f.spec.metadata_field! !== true &&
              getDataDriftType(f.type) !== 'unsupported' &&
              mergedFields.findIndex((merged) => merged.field === f.name) === -1
          )
          .map((f) => ({
            field: f.name,
            type: getDataDriftType(f.type),
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
  const result = useFetchDataDriftResult({
    ...fetchInfo,
    searchString,
    searchQueryLanguage,
    searchQuery,
  });

  const filteredData = useMemo(() => {
    if (!result?.data) return [];

    switch (showDataDriftedOnly) {
      case true:
        return result.data.filter((d) => d.driftDetected === true);
      default:
        return result.data;
    }
  }, [result.data, showDataDriftedOnly]);

  const { onTableChange, pagination, sorting, setPageIndex } = useTableState<Feature>(
    filteredData ?? [],
    'driftDetected',
    'desc'
  );

  const shouldRerunAnalysis = useMemo(
    () =>
      currentAnalysisWindowParameters !== undefined &&
      !isEqual(currentAnalysisWindowParameters, windowParameters),
    [currentAnalysisWindowParameters, windowParameters]
  );

  const onShowDataDriftedOnlyToggle = (e: EuiSwitchEvent) => {
    setShowDataDriftedOnly(e.target.checked);
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
            id="xpack.aiops.dataDrift.emptyPromptTitle"
            defaultMessage="Click a time range in the histogram chart to compare baseline and deviation data."
          />
        </h2>
      }
      titleSize="xs"
      body={
        <p>
          <FormattedMessage
            id="xpack.aiops.dataDrift.emptyPromptBody"
            defaultMessage="The data drift feature identifies statistically significant field/value combinations that contribute to a log rate spike."
          />
        </p>
      }
      data-test-subj="aiopsNoWindowParametersEmptyPrompt"
    />
  ) : (
    <div>
      <ProgressControls
        progress={result.loaded}
        progressMessage={''}
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
              checked={showDataDriftedOnly}
              onChange={onShowDataDriftedOnlyToggle}
              compressed
            />
          </EuiFormRow>
        </EuiFlexItem>
      </ProgressControls>
      {result.error ? <EuiEmptyPrompt color="danger">{result.error}</EuiEmptyPrompt> : null}

      {filteredData ? (
        <DataDriftOverviewTable
          data={filteredData}
          onTableChange={onTableChange}
          pagination={pagination}
          sorting={sorting}
          setPageIndex={setPageIndex}
        />
      ) : null}
    </div>
  );
};

export const DataDriftOverviewTable = ({
  data,
  onTableChange,
  pagination,
  sorting,
}: {
  data: Feature[];
} & UseTableState) => {
  const euiTheme = useEuiTheme();
  const colors = {
    referenceColor: euiTheme.euiColorVis2,
    productionColor: euiTheme.euiColorVis1,
  };
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const features = useMemo(() => {
    const { pageIndex, pageSize } = pagination;
    const {
      sort: { field: sortField, direction: sortDirection },
    } = sorting;
    if (data.length === 0) return [];

    const items = sortField
      ? [...data].sort(Comparators.property(sortField, Comparators.default(sortDirection)))
      : data;
    let pageOfItems = [];

    if (!pageIndex && !pageSize) {
      pageOfItems = items;
    } else {
      const startIndex = pageIndex * pageSize;
      pageOfItems = items.slice(startIndex, Math.min(startIndex + pageSize, data.length));
    }
    return pageOfItems;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pagination.pageIndex, pagination.pageSize, sorting.sort.direction, sorting.sort.field]);

  // if data is an empty array return
  if (features.length === 0) {
    return null;
  }

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
      name: i18n.translate('xpack.aiops.dataDrift.fieldNameLabel', {
        defaultMessage: 'Field name',
      }),
      'data-test-subj': 'mlDataDriftOverviewTableFeatureName',
      sortable: true,
      textOnly: true,
    },
    {
      field: 'fieldType',
      name: i18n.translate('xpack.aiops.dataDrift.fieldTypeLabel', {
        defaultMessage: 'Field type',
      }),
      'data-test-subj': 'mlDataDriftOverviewTableFeatureType',
      sortable: true,
      textOnly: true,
      render: (fieldType: DataDriftField['type']) => {
        return <span>{DATA_DRIFT_TYPE_LABEL[fieldType]}</span>;
      },
    },
    {
      field: 'driftDetected',
      name: i18n.translate('xpack.aiops.dataDrift.driftDetectedLabel', {
        defaultMessage: 'Drift detected',
      }),
      'data-test-subj': 'mlDataDriftOverviewTableDriftDetected',
      sortable: true,
      textOnly: true,
      render: (driftDetected: boolean) => {
        return <span>{driftDetected ? dataDriftedYesLabel : dataDriftedNoLabel}</span>;
      },
    },
    {
      field: 'similarityTestPValue',
      name: 'Similarity test p-value',
      'data-test-subj': 'mlDataDriftOverviewTableSimilarityTestPValue',
      sortable: true,
      textOnly: true,
      render: (similarityTestPValue: number, feature: Feature) => {
        return <span>{formatSignificanceLevel(similarityTestPValue)}</span>;
      },
    },
    {
      field: 'referenceHistogram',
      name: 'Reference distribution',
      'data-test-subj': 'mlDataDriftOverviewTableReferenceDistribution',
      sortable: false,
      render: (referenceHistogram: Feature['referenceHistogram'], item) => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <ReferenceDistribution
              fieldType={item.fieldType}
              data={referenceHistogram}
              color={colors.referenceColor}
            />
          </div>
        );
      },
    },
    {
      field: 'productionHistogram',
      name: 'Production distribution',
      'data-test-subj': 'mlDataDriftOverviewTableProductionDistribution',
      sortable: false,
      render: (productionDistribution: Feature['productionHistogram'], item) => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <ProductionDistribution
              fieldType={item.fieldType}
              data={productionDistribution}
              color={colors.productionColor}
            />
          </div>
        );
      },
    },
    {
      field: 'comparisonDistribution',
      name: 'Comparison',
      'data-test-subj': 'mlDataDriftOverviewTableProductionDistribution',
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
      'data-test-subj': `mlDataDriftOverviewTableRow row-${item.featureName}`,
      className: 'mlDataDriftOverviewTableRow',
      onClick: () => {},
    };
  };

  const getCellProps = (item: Feature, column: EuiTableFieldDataColumnType<Feature>) => {
    const { field } = column;
    return {
      className: 'mlDataDriftOverviewTableCell',
      'data-test-subj': `mlDataDriftOverviewTableCell row-${item.featureName}-column-${String(
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
          <DataDriftChart
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
    <EuiBasicTable
      tableCaption={i18n.translate('xpack.aiops.dataDrift.dataDriftTableCaption', {
        defaultMessage: 'Data drift overview',
      })}
      items={features}
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
