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
  EuiFormRow,
  EuiScreenReaderOnly,
  htmlIdGenerator,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { WindowParameters } from '@kbn/aiops-utils';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { getDataDriftType, useFetchDataDriftResult } from './use_data_drift_result';
import { NUMERIC_TYPE_LABEL } from './constants';
import { Histogram, ComparisionHistogram, Feature, DataDriftField } from './types';

const formatSignificanceLevel = (significanceLevel: number) => {
  if (significanceLevel < 1e-6) {
    return <span>&lt; 0.000001</span>;
  } else if (significanceLevel < 0.01) {
    return significanceLevel.toExponential(0);
  } else {
    return significanceLevel.toFixed(2);
  }
};

const idPrefix = htmlIdGenerator()();

export const DataViewSelector = ({
  type,
  onChangeDataView,
  dataView,
}: {
  type: 'reference' | 'production';
  onChangeDataView: (newDataViewId: string) => void;
  dataView?: DataView;
}) => {
  return (
    <EuiFormRow label={`Select ${type} data view`} id={idPrefix}>
      {/* <DataViewPicker*/}
      {/*  trigger={{ label: dataView ? dataView.getName() : 'Pick data view' }}*/}
      {/*  onChangeDataView={onChangeDataView}*/}
      {/* />*/}
    </EuiFormRow>
  );
};

// Reference data numeric distribution
export const ReferenceDistribution = ({ data }: { data: Histogram[] }) => {
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
      />
    </Chart>
  );
};

// Production data numeric distribution
export const ProductionDistribution = ({ data }: { data: Histogram[] }) => {
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
      />
    </Chart>
  );
};

const DataDriftChart = ({
  featureName,
  featureType,
  data,
}: {
  featureName: string;
  featureType: string;
  data: ComparisionHistogram[];
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
  const {
    data: { dataViews },
  } = useAiopsAppContext();

  const [tempTimeRanges, setTempTimeRanges] = useState({
    reference: { start: 'now-30m', end: 'now' },
    production: { start: 'now-30m', end: 'now' },
  });

  const [referenceDataView, setReferenceDataView] = useState<DataView | undefined>(dataView);
  const [productionDataView, setProductionDataView] = useState<DataView | undefined>(dataView);
  const [fetchInfo, setFetchIno] = useState<
    | {
        fields: DataDriftField[];
        referenceDataView: DataView;
        productionDataView: DataView;
        timeRanges: { reference: TimeRange; production: TimeRange };
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
      referenceDataView: dataView,
      productionDataView: dataView,
      timeRanges: {
        reference: { start: windowParameters?.baselineMin, end: windowParameters?.baselineMax },
        production: { start: windowParameters?.deviationMin, end: windowParameters?.deviationMax },
      },
    });
  }, [dataView, windowParameters]);
  const result = useFetchDataDriftResult(fetchInfo);
  console.log(`--@@result`, result);
  const dataFromResult = result.data;

  return (
    <div>
      <EuiButton disabled={!dataView || !windowParameters} onClick={updateFieldsAndTime}>
        Analyze
      </EuiButton>

      {/* <EuiFlexGroup>*/}
      {/*  <EuiFlexItem>*/}
      {/*    <DataViewSelector*/}
      {/*      type="reference"*/}
      {/*      onChangeDataView={(newDataViewId) => updateDataView('reference', newDataViewId)}*/}
      {/*      dataView={referenceDataView}*/}
      {/*    />*/}
      {/*    <EuiSpacer size="m" />*/}

      {/*    <EuiSuperDatePicker*/}
      {/*      width="restricted"*/}
      {/*      onTimeChange={(ts) => onTimeChange('reference', ts)}*/}
      {/*      start={tempTimeRanges.reference.start}*/}
      {/*      end={tempTimeRanges.reference.end}*/}
      {/*      showUpdateButton={false}*/}
      {/*    />*/}
      {/*  </EuiFlexItem>*/}
      {/*  <EuiFlexItem>*/}
      {/*    <DataViewSelector*/}
      {/*      type="production"*/}
      {/*      onChangeDataView={(newDataViewId) => updateDataView('production', newDataViewId)}*/}
      {/*      dataView={productionDataView}*/}
      {/*    />*/}
      {/*    <EuiSpacer size="m" />*/}
      {/*    <EuiSuperDatePicker*/}
      {/*      width="restricted"*/}
      {/*      onTimeChange={(ts) => onTimeChange('production', ts)}*/}
      {/*      start={tempTimeRanges.production.start}*/}
      {/*      end={tempTimeRanges.production.end}*/}
      {/*      showUpdateButton={false}*/}
      {/*    />*/}
      {/*  </EuiFlexItem>*/}
      {/*  <EuiFlexItem grow={false}>*/}
      {/*    <EuiFormRow hasEmptyLabelSpace>*/}
      {/*      <EuiButton*/}
      {/*        disabled={!referenceDataView || !productionDataView}*/}
      {/*        onClick={updateFieldsAndTime}*/}
      {/*      >*/}
      {/*        Analyze*/}
      {/*      </EuiButton>*/}
      {/*    </EuiFormRow>*/}
      {/*  </EuiFlexItem>*/}
      {/* </EuiFlexGroup>*/}

      {/* <EuiSpacer size="m" />*/}
      {/* {result.status === FETCH_STATUS.NOT_INITIATED ? (*/}
      {/*  <EuiCallOut>Pick a reference data view and production data view to detect drift</EuiCallOut>*/}
      {/* ) : null}*/}
      {/* {result.status === FETCH_STATUS.LOADING ? 'Loading' : null}*/}
      {dataFromResult ? <DataDriftOverviewTable data={dataFromResult} /> : null}
    </div>
  );
};

export const OverlapDistributionComparison = ({ data }: { data: ComparisionHistogram[] }) => {
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
      />
    </Chart>
  );
};

export const DataDriftOverviewTable = ({ data }: { data: Feature[] }) => {
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
      name: 'Feature name',
      'data-test-subj': 'mlDataDriftOverviewTableFeatureName',
      sortable: true,
      textOnly: true,
    },
    {
      field: 'featureType',
      name: 'Feature type',
      'data-test-subj': 'mlDataDriftOverviewTableFeatureType',
      sortable: true,
      textOnly: true,
    },
    {
      field: 'driftDetected',
      name: 'Drift detected',
      'data-test-subj': 'mlDataDriftOverviewTableDriftDetected',
      sortable: true,
      textOnly: true,
      render: (driftDetected: boolean) => {
        return <span>{driftDetected ? 'Yes' : 'No'}</span>;
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
            <ReferenceDistribution data={referenceHistogram} />
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
            <ProductionDistribution data={productionDistribution} />
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
            <OverlapDistributionComparison data={comparisonDistribution} />
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
          />
        </div>
      );
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  return (
    <EuiBasicTable
      tableCaption="Data drift overview"
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
