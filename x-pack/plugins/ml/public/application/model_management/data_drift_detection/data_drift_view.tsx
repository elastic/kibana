/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode, useMemo, useState } from 'react';
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
  EuiButtonIcon,
  EuiSpacer,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiTableFieldDataColumnType,
  EuiFormRow,
  EuiSuggest,
  EuiScreenReaderOnly,
  EuiSuggestionProps,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isNumericDriftData, useFetchDataDriftResult } from '../../hooks/use_data_search';

const NUMERIC_TYPE_LABEL = i18n.translate('xpack.ml.trainedModels.driftData.numericLabel', {
  defaultMessage: 'Numeric',
});
const CATEGORICAL_TYPE_LABEL = i18n.translate('xpack.ml.trainedModels.driftData.categoricalLabel', {
  defaultMessage: 'Categorical',
});

const UNKNOWN_PVALUE_LABEL = i18n.translate('xpack.ml.trainedModels.driftData.unknownPValueLabel', {
  defaultMessage: 'Unknown',
});

const REFERENCE_LABEL = i18n.translate('xpack.ml.trainedModels.driftData.referenceLabel', {
  defaultMessage: 'Reference',
});

const PRODUCTION_LABEL = i18n.translate('xpack.ml.trainedModels.driftData.productionLabel', {
  defaultMessage: 'Production',
});

interface Histogram {
  doc_count: 0;
  key: string | number;
}

interface ComparisionHistogram extends Histogram {
  g: string;
}

// Show the overview table
interface Feature {
  featureName: string;
  featureType: string;
  driftDetected: boolean;
  similarityTestPValue: number;
  productionHistogram: Histogram[];
  referenceHistogram: Histogram[];
  comparisonDistribution: ComparisionHistogram[];
}

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
        yAccessors={['doc_count']}
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
        yAccessors={['doc_count']}
        data={data}
      />
    </Chart>
  );
};

const DataDriftChart = ({
  featureName,
  data,
}: {
  featureName: string;
  data: ComparisionHistogram[];
}) => {
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
        name={featureName}
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        xAccessor="key"
        yAccessors={['doc_count']}
        splitSeriesAccessors={['g']}
        data={data}
      />
    </Chart>
  );
};
// Data drift view
export const DataDriftView = () => {
  const result = useFetchDataDriftResult([
    { field: 'numeric_unchangeable', type: 'numeric' },
    { field: 'numeric_changeable', type: 'numeric' },
    { field: 'categoric_unchangeable', type: 'categoric' },
    { field: 'categoric_changeable', type: 'categoric' },
  ]);

  // @TODO: Format data for dataFromResult and use it in table and charts
  const dataFromResult: Feature[] = useMemo(() => {
    if (!result.data) {
      return [];
    }
    return Object.entries(result.data).map(([featureName, data], idx) => {
      if (isNumericDriftData(data)) {
        return {
          featureName,
          featureType: NUMERIC_TYPE_LABEL,
          // @TODO: Update logic with threshold
          driftDetected: true,
          similarityTestPValue: data.pValue,
          referenceHistogram: data.referenceHistogram ?? [],
          productionHistogram: data.productionHistogram ?? [],
          comparisonDistribution: [
            ...data.referenceHistogram.map((h) => ({ ...h, g: REFERENCE_LABEL })),
            ...data.productionHistogram.map((h) => ({ ...h, g: PRODUCTION_LABEL })),
          ],
        };
      }
      // @TODO: Update logic for what to show for categorical
      return {
        featureName,
        featureType: CATEGORICAL_TYPE_LABEL,
        driftDetected: true,
        similarityTestPValue: 0,
        // @TODO: Need to sort order for baseline terms and drifted terms for consistency?
        referenceHistogram: data.baselineTerms ?? [],
        productionHistogram: data.driftedTerms ?? [],
        comparisonDistribution: [
          ...data.baselineTerms.map((h) => ({ ...h, g: REFERENCE_LABEL })),
          ...data.driftedTerms.map((h) => ({ ...h, g: PRODUCTION_LABEL })),
        ],
      };
    });
  }, [result]);

  return (
    <div>
      <ReferenceDataViewSelector />
      <ProductionDataViewSelector />
      <EuiSpacer size="m" />

      <DataDriftOverviewTable data={dataFromResult} />
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
        yAccessors={['doc_count']}
        splitSeriesAccessors={['g']}
        data={data}
        curve={CurveType.CURVE_STEP_AFTER}
      />
    </Chart>
  );
};

export const DataDriftOverviewTable = ({ data }: { data: Feature[] }) => {
  console.log('DataDriftOverviewTable data ', data);
  // if data is an empty array return
  if (data.length === 0) {
    return null;
  }

  const features = data;
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
      render: (similarityTestPValue: number, feature: Feature) => {
        return (
          <span>
            {feature.featureType === NUMERIC_TYPE_LABEL
              ? // @TODO: format this better
                feature.similarityTestPValue
              : UNKNOWN_PVALUE_LABEL}
          </span>
        );
      },
      // render: (similarityTestPValue: number) => {
      //   return <span>{similarityTestPValue}</span>;
      // },
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
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const toggleDetails = (item: Feature) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

    if (itemIdToExpandedRowMapValues[item.featureName]) {
      delete itemIdToExpandedRowMapValues[item.featureName];
    } else {
      const { featureName, comparisonDistribution } = item;
      itemIdToExpandedRowMapValues[item.featureName] = (
        <div css={{ width: '100%', height: 200 }}>
          <DataDriftChart featureName={featureName} data={comparisonDistribution} />
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
    />
  );
};
