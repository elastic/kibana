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
} from '@elastic/charts';
import {
  EuiButton,
  Comparators,
  EuiTableSortingType,
  Criteria,
  EuiButtonIcon,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiTableFieldDataColumnType,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { WindowParameters } from '@kbn/aiops-utils';
import { SeriesColorAccessor } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '../../hooks/use_eui_theme';
import { getDataDriftType, useFetchDataDriftResult } from './use_data_drift_result';
import { NUMERIC_TYPE_LABEL } from './constants';
import { Histogram, ComparisionHistogram, Feature, DataDriftField, TimeRange } from './types';

const formatSignificanceLevel = (significanceLevel: number) => {
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
}: {
  data: Histogram[];
  color?: SeriesColorAccessor;
}) => {
  return (
    <Chart>
      <Settings />
      <BarSeries
        id="reference-distr-viz"
        name="Reference distribution"
        xScaleType={ScaleType.Linear}
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
}: {
  data: Histogram[];
  color?: SeriesColorAccessor;
}) => {
  return (
    <Chart>
      <Settings />
      <BarSeries
        id="production-distr-viz"
        name="Production distribution"
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        xAccessor="key"
        yAccessors={['percentage']}
        data={data}
        color={color}
      />
    </Chart>
  );
};

const DataDriftChart = ({
  featureName,
  featureType,
  data,
  colors,
}: {
  featureName: string;
  featureType: string;
  data: ComparisionHistogram[];
  colors: { referenceColor: string; productionColor: string };
}) => {
  return (
    <Chart>
      <Settings showLegend showLegendExtra legendPosition={Position.Right} />
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
        xScaleType={featureType === NUMERIC_TYPE_LABEL ? ScaleType.Linear : ScaleType.Ordinal}
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

// Data drift view
export const DataDriftView = ({
  windowParameters,
  dataView,
}: {
  windowParameters?: WindowParameters;
  dataView: DataView;
}) => {
  const [fetchInfo, setFetchIno] = useState<
    | {
        fields: DataDriftField[];
        currentDataView: DataView;
        timeRanges?: { reference: TimeRange; production: TimeRange };
      }
    | undefined
  >();

  const updateFieldsAndTime = useCallback(() => {
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
  const result = useFetchDataDriftResult(fetchInfo);

  const dataFromResult = result.data;

  return (
    <div>
      <EuiButton disabled={!dataView || !windowParameters} onClick={updateFieldsAndTime}>
        Analyze
      </EuiButton>

      {dataFromResult ? <DataDriftOverviewTable data={dataFromResult} /> : null}
    </div>
  );
};

export const OverlapDistributionComparison = ({
  data,
  colors,
}: {
  data: ComparisionHistogram[];
  colors: { referenceColor: string; productionColor: string };
}) => {
  return (
    <Chart>
      <Settings showLegend={false} />
      <AreaSeries
        id="data-drift-viz"
        name="Comparison distribution"
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        xAccessor="key"
        yAccessors={['percentage']}
        splitSeriesAccessors={['g']}
        data={data}
        curve={CurveType.CURVE_STEP_AFTER}
        color={(identifier) => {
          const key = identifier.seriesKeys[0];
          return key === 'Production' ? colors.productionColor : colors.referenceColor;
        }}
      />
    </Chart>
  );
};

export const DataDriftOverviewTable = ({ data }: { data: Feature[] }) => {
  const euiTheme = useEuiTheme();
  const colors = {
    referenceColor: euiTheme.euiColorVis2,
    productionColor: euiTheme.euiColorVis1,
  };
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState<keyof Feature>('driftDetected');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const onTableChange = ({ page, sort }: Criteria<Feature>) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
    if (sort) {
      setSortField(sort.field);
      setSortDirection(sort.direction);
    }
  };

  const sorting: EuiTableSortingType<Feature> = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };
  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data.length,
    pageSizeOptions: [5, 10, 20, 50],
  };
  // const features = data;
  const features = useMemo(() => {
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
  }, [data, sortField, sortDirection, pageIndex, pageSize]);

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
      field: 'featureType',
      name: i18n.translate('xpack.aiops.dataDrift.fieldTypeLabel', {
        defaultMessage: 'Field type',
      }),
      'data-test-subj': 'mlDataDriftOverviewTableFeatureType',
      sortable: true,
      textOnly: true,
    },
    {
      field: 'driftDetected',
      name: i18n.translate('xpack.aiops.dataDrift.driftDetectedLabel', {
        defaultMessage: 'Field type',
      }),
      'data-test-subj': 'mlDataDriftOverviewTableDriftDetected',
      sortable: true,
      textOnly: true,
      render: (driftDetected: boolean) => {
        return (
          <span>
            {driftDetected
              ? i18n.translate('xpack.aiops.dataDrift.fieldTypeYesLabel', {
                  defaultMessage: 'Yes',
                })
              : i18n.translate('xpack.aiops.dataDrift.driftDetectedNoLabel', {
                  defaultMessage: 'No',
                })}
          </span>
        );
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
      render: (referenceHistogram: Feature['referenceHistogram']) => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <ReferenceDistribution data={referenceHistogram} color={colors.referenceColor} />
          </div>
        );
      },
    },
    {
      field: 'productionHistogram',
      name: 'Production distribution',
      'data-test-subj': 'mlDataDriftOverviewTableProductionDistribution',
      sortable: false,
      render: (productionDistribution: Feature['productionHistogram']) => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <ProductionDistribution data={productionDistribution} color={colors.productionColor} />
          </div>
        );
      },
    },
    {
      field: 'comparisonDistribution',
      name: 'Comparison',
      'data-test-subj': 'mlDataDriftOverviewTableProductionDistribution',
      sortable: false,
      render: (comparisonDistribution: Feature['comparisonDistribution']) => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <OverlapDistributionComparison data={comparisonDistribution} colors={colors} />
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
            featureType={item.featureType}
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
