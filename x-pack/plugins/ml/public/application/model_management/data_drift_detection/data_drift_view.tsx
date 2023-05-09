/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Chart, Settings, BarSeries, ScaleType, Position, Axis } from '@elastic/charts';
import {
  EuiLink,
  EuiSpacer,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiTableFieldDataColumnType,
  EuiFormRow,
  EuiSuggest,
  EuiSuggestionProps,
  htmlIdGenerator,
} from '@elastic/eui';

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
    <div>
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

// Data drift view
export const DataDriftView = () => {
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
    <div>
      <EuiSpacer size="m" />

      <div>
        <EuiLink
          href="https://elastic.github.io/eui/#/tabular-content/tables#a-basic-table"
          target="_blank"
        >
          Add EuiBasicTable below here
        </EuiLink>
      </div>
      <EuiSpacer size="m" />

      <div style={{ width: '100%', height: 500 }}>
        <EuiLink
          href="https://elastic.github.io/elastic-charts/?path=/story/bar-chart--bar-chart-1-y-1-g&globals=theme:light"
          target="_blank"
        >
          Example chart to be integrated into above table
        </EuiLink>
        <Chart>
          <Settings showLegend showLegendExtra legendPosition={Position.Right} />
          <Axis id="bottom" position={Position.Bottom} title="Bottom axis" showOverlappingTicks />
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
            data={BARCHART_1Y1G}
          />
        </Chart>
      </div>
    </div>
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
        return <ReferenceDistribution />;
      },
    },
    {
      field: 'productionDistribution',
      name: 'Production distribution',
      'data-test-subj': 'mlDataDriftOverviewTableProductionDistribution',
      sortable: false,
      render: () => {
        return <ProductionDistribution />;
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
