/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
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
  EuiSpacer,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiTableFieldDataColumnType,
  EuiFormRow,
  EuiSuggest,
  EuiSuggestionProps,
  htmlIdGenerator,
} from '@elastic/eui';
import { getProcessedFields } from '../../components/data_grid';
import { useFetchEsRequest } from '../../hooks/use_data_search';

// Select reference data view
const sampleDataViews = [
  {
    type: { iconType: 'search', color: 'tint10' },
    label: 'baseline',
    description: 'baseline',
  },
  {
    type: { iconType: 'search', color: 'tint10' },
    label: 'drifted',
  },
];

const idPrefix = htmlIdGenerator()();

export const ReferenceDataViewSelector = () => {
  const onItemClick = (item: EuiSuggestionProps) => {
    console.log(item);
  };

  return (
    <div css={{ display: 'flex', flexDirection: 'row' }}>
      <EuiFormRow label="Select reference data view" id={idPrefix}>
        <EuiSuggest
          fullWidth
          aria-labelledby={`${idPrefix}-label`}
          // status={status}
          onInput={() => {}}
          onItemClick={onItemClick}
          placeholder="Start typing to display suggestions"
          suggestions={sampleDataViews}
        />
      </EuiFormRow>
    </div>
  );
};

export const ProductionDataViewSelector = () => {
  const onItemClick = (item: EuiSuggestionProps) => {
    console.log(item);
  };

  return (
    <div>
      <EuiFormRow label="Select production data view" id={idPrefix}>
        <EuiSuggest
          fullWidth
          aria-labelledby={`${idPrefix}-label`}
          // status={status}
          onInput={() => {}}
          onItemClick={onItemClick}
          placeholder="Start typing to display suggestions"
          suggestions={sampleDataViews}
        />
      </EuiFormRow>
    </div>
  );
};

// export const ReferenceDataViewSelector = () => {
//   const [isClearable, setIsClearable] = useState(true);
//   const [value, setValue] = useState('');

//   const onChange = (e) => {
//     setValue(e.target.value);
//   };

//   return (
//     <EuiFieldSearch
//       placeholder="Select reference data view"
//       value={value}
//       onChange={(e) => onChange(e)}
//       // onItemClick={onItemClick}
//       suggestions={sampleDataViews}
//       isClearable={isClearable}
//       aria-label="Use aria labels when no actual label is in use"
//     />
//   );
// };

// Reference data numeric distribution
export const ReferenceDistribution = () => {
  const data1 = [
    { x: 0, y: 2 },
    { x: 1, y: 7 },
    { x: 2, y: 3 },
    { x: 3, y: 6 },
  ];

  return (
    <Chart>
      <Settings />
      <BarSeries
        id="reference-distr-viz"
        name="Simple bar series"
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        xAccessor="x"
        yAccessors={['y']}
        data={data1}
      />
    </Chart>
  );
};

// Production data numeric distribution
export const ProductionDistribution = () => {
  const data1 = [
    { x: 0, y: 2 },
    { x: 1, y: 7 },
    { x: 2, y: 3 },
    { x: 3, y: 6 },
  ];

  return (
    <Chart>
      <Settings />
      <BarSeries
        id="production-distr-viz"
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        xAccessor="x"
        yAccessors={['y']}
        data={data1}
      />
    </Chart>
  );
};

const ExampleChart = ({ data }: { data: any }) => {
  const chartData = data ?? [
    { x: 0, g: 'reference', y: 1 },
    { x: 0, g: 'production', y: 2 },
    { x: 1, g: 'reference', y: 2 },
    { x: 1, g: 'production', y: 3 },
    { x: 2, g: 'reference', y: 3 },
    { x: 2, g: 'production', y: 4 },
    { x: 3, g: 'reference', y: 4 },
    { x: 3, g: 'production', y: 5 },
  ];

  return (
    <Chart>
      <Settings showLegend showLegendExtra legendPosition={Position.Right} />
      <Axis id="bottom" position={Position.Bottom} title="Bottom axis" />
      <Axis
        id="left2"
        title="Left axis"
        position={Position.Left}
        tickFormat={(d: any) => Number(d).toFixed(2)}
      />
      <BarSeries
        id="data-drift-viz"
        name="Simple bar series"
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        xAccessor="x"
        yAccessors={['y']}
        splitSeriesAccessors={['g']}
        data={chartData}
      />
    </Chart>
  );
};
// Data drift view
export const DataDriftView = () => {
  // @TODO: Example request - replace with real request
  const esSearchRequest = {
    index: '*',
    body: {
      fields: ['*'],
      _source: false,
      query: {
        match_all: {},
      },
      size: 5,
    },
  };
  const result = useFetchEsRequest(esSearchRequest);

  console.log(`--@@useFetchEsRequest result`, result);

  const dataFromResult = useMemo(() => {
    if (!result.data) {
      return [];
    }
    // @TODO: Need to reformat ES results data response into something meaningful for plotting data
    // getProcessedFields() is a helper function to strip array values from "fields"
    // { agent.name: ["js-base"],  agent.version: ["2.2.0"] } =>  { agent.name: "js-base",  agent.version: "2.2.0" }
    const data = result.data.hits.hits.map((h) => getProcessedFields(h.fields ?? {}));
    return data;
  }, [result]);

  console.log(`--@@dataFromResult`, dataFromResult);

  return (
    <div>
      <ReferenceDataViewSelector />
      <ProductionDataViewSelector />

      <DataDriftOverviewTable />
      <EuiSpacer size="m" />

      <div css={{ width: '100%', height: 300 }}>
        {/* @TODO: dataFromResult is being passed as chartData as an example
         it needs to be formatted correctly */}
        <ExampleChart chartData={dataFromResult} />
      </div>
    </div>
  );
};

export const OverlapDistributionComparison = () => {
  const BARCHART_1Y1G = [
    { x: 0, g: 'reference', y: 1 },
    { x: 0, g: 'production', y: 2 },
    { x: 1, g: 'reference', y: 2 },
    { x: 1, g: 'production', y: 3 },
    { x: 2, g: 'reference', y: 3 },
    { x: 2, g: 'production', y: 4 },
    { x: 3, g: 'reference', y: 4 },
    { x: 3, g: 'production', y: 5 },
  ];
  return (
    <Chart>
      <Settings showLegend={false} />
      <AreaSeries
        id="data-drift-viz"
        name="Simple bar series"
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        xAccessor="x"
        yAccessors={['y']}
        splitSeriesAccessors={['g']}
        data={BARCHART_1Y1G}
        curve={CurveType.CURVE_STEP_AFTER}
      />
    </Chart>
  );
};

// Show the overview table
interface Feature {
  featureName: string;
  featureType: string;
  driftDetected: boolean;
  similarityTestPValue: number;
}

const features: Feature[] = [
  {
    featureName: 'numeric_unchangeable',
    featureType: 'number',
    driftDetected: false,
    similarityTestPValue: 0.25,
  },
  {
    featureName: 'numeric_changeable',
    featureType: 'number',
    driftDetected: true,
    similarityTestPValue: 0.00001,
  },
  {
    featureName: 'categorial_unchangeable',
    featureType: 'categorical',
    driftDetected: false,
    similarityTestPValue: 0.25,
  },
  {
    featureName: 'categorical_changeable',
    featureType: 'categorical',
    driftDetected: true,
    similarityTestPValue: 0.00001,
  },
];

export const DataDriftOverviewTable = () => {
  const columns: Array<EuiBasicTableColumn<Feature>> = [
    {
      field: 'featureName',
      name: 'Feature name',
      'data-test-subj': 'mlDataDriftOverviewTableFeatureName',
      sortable: true,
      textOnly: true,
      render: (featureName: string) => {
        return <span>{featureName}</span>;
      },
    },
    {
      field: 'featureType',
      name: 'Feature type',
      'data-test-subj': 'mlDataDriftOverviewTableFeatureType',
      sortable: true,
      textOnly: true,
      render: (featureType: string) => {
        return <span>{featureType}</span>;
      },
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
      render: (similarityTestPValue: number) => {
        return <span>{similarityTestPValue}</span>;
      },
    },
    {
      field: 'referenceDistribution',
      name: 'Reference distribution',
      'data-test-subj': 'mlDataDriftOverviewTableReferenceDistribution',
      sortable: false,
      render: () => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <ReferenceDistribution />
          </div>
        );
      },
    },
    {
      field: 'productionDistribution',
      name: 'Production distribution',
      'data-test-subj': 'mlDataDriftOverviewTableProductionDistribution',
      sortable: false,
      render: () => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <ProductionDistribution />
          </div>
        );
      },
    },
    {
      field: 'comparisonDistribution',
      name: 'Comparison',
      'data-test-subj': 'mlDataDriftOverviewTableProductionDistribution',
      sortable: false,
      render: () => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <OverlapDistributionComparison />
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

  return (
    <EuiBasicTable
      tableCaption="Data drift overview"
      items={features}
      rowHeader="featureName"
      columns={columns}
      rowProps={getRowProps}
      cellProps={getCellProps}
    />
  );
};
