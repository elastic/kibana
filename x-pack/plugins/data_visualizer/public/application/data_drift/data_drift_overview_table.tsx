/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseTableState } from '@kbn/ml-in-memory-table';
import type { ReactNode } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn, EuiTableFieldDataColumnType } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiIcon,
  EuiInMemoryTable,
  EuiScreenReaderOnly,
  EuiToolTip,
} from '@elastic/eui';
import { FieldTypeIcon } from '../common/components/field_type_icon';
import { COLLAPSE_ROW, EXPAND_ROW } from '../../../common/i18n_constants';
import { COMPARISON_LABEL, REFERENCE_LABEL } from './constants';
import { useCurrentEuiTheme } from '../common/hooks/use_current_eui_theme';
import { type DataDriftField, type Feature, FETCH_STATUS } from './types';
import { formatSignificanceLevel } from './data_drift_utils';
import { SingleDistributionChart } from './charts/single_distribution_chart';
import { OverlapDistributionComparison } from './charts/overlap_distribution_chart';
import { DataDriftDistributionChart } from './charts/data_drift_distribution_chart';

const dataComparisonYesLabel = i18n.translate('xpack.dataVisualizer.dataDrift.fieldTypeYesLabel', {
  defaultMessage: 'Yes',
});
const dataComparisonNoLabel = i18n.translate(
  'xpack.dataVisualizer.dataDrift.driftDetectedNoLabel',
  {
    defaultMessage: 'No',
  }
);

export const DataDriftOverviewTable = ({
  data,
  onTableChange,
  pagination,
  sorting,
  status,
}: {
  data: Feature[];
  status: FETCH_STATUS;
} & UseTableState<Feature>) => {
  const euiTheme = useCurrentEuiTheme();

  const colors = useMemo(
    () => ({
      referenceColor: euiTheme.euiColorVis2,
      comparisonColor: euiTheme.euiColorVis1,
    }),
    [euiTheme]
  );
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const referenceDistributionLabel = i18n.translate(
    'xpack.dataVisualizer.dataDrift.dataComparisonDistributionLabel',
    {
      defaultMessage: '{label} distribution',
      values: { label: REFERENCE_LABEL },
    }
  );
  const comparisonDistributionLabel = i18n.translate(
    'xpack.dataVisualizer.dataDrift.dataComparisonDistributionLabel',
    {
      defaultMessage: '{label} distribution',
      values: { label: COMPARISON_LABEL },
    }
  );

  useEffect(() => {
    const updatedItemIdToExpandedRowMap = { ...itemIdToExpandedRowMap };
    // Update expanded row in case data is stale
    Object.keys(updatedItemIdToExpandedRowMap).forEach((itemId) => {
      const item = data.find((d) => d.featureName === itemId);
      if (item) {
        const { featureName } = item;

        updatedItemIdToExpandedRowMap[featureName] = (
          <DataDriftDistributionChart
            item={item}
            colors={colors}
            secondaryType={item.secondaryType}
          />
        );
      }
    });
    setItemIdToExpandedRowMap(updatedItemIdToExpandedRowMap);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, colors]);

  const columns: Array<EuiBasicTableColumn<Feature>> = [
    {
      align: 'left',
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>{EXPAND_ROW}</span>
        </EuiScreenReaderOnly>
      ),
      render: (item: Feature) => {
        const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

        return (
          <EuiButtonIcon
            data-test-subj={`dataDriftToggleDetails-${
              itemIdToExpandedRowMapValues[item.featureName] ? 'expanded' : 'collapsed'
            }`}
            onClick={() => toggleDetails(item)}
            aria-label={itemIdToExpandedRowMapValues[item.featureName] ? COLLAPSE_ROW : EXPAND_ROW}
            iconType={itemIdToExpandedRowMapValues[item.featureName] ? 'arrowDown' : 'arrowRight'}
          />
        );
      },
    },

    {
      field: 'featureName',
      name: i18n.translate('xpack.dataVisualizer.dataDrift.fieldNameLabel', {
        defaultMessage: 'Name',
      }),
      'data-test-subj': 'mlDataDriftOverviewTableFeatureName',
      sortable: true,
      textOnly: true,
    },
    {
      field: 'secondaryType',
      name: i18n.translate('xpack.dataVisualizer.dataDrift.fieldTypeLabel', {
        defaultMessage: 'Type',
      }),
      'data-test-subj': 'mlDataDriftOverviewTableFeatureType',
      sortable: true,
      textOnly: true,
      render: (secondaryType: DataDriftField['secondaryType']) => {
        return <FieldTypeIcon type={secondaryType} tooltipEnabled={true} />;
      },
    },
    {
      field: 'driftDetected',
      name: i18n.translate('xpack.dataVisualizer.dataDrift.driftDetectedLabel', {
        defaultMessage: 'Drift detected',
      }),
      'data-test-subj': 'mlDataDriftOverviewTableDriftDetected',
      sortable: true,
      textOnly: true,
      render: (driftDetected: boolean, item) => {
        // @ts-expect-error currently ES two_sided does return string NaN, will be fixed
        // NaN happens when the distributions are non overlapping. This means there is a drift.
        if (item.similarityTestPValue === 'NaN') return dataComparisonYesLabel;
        return <span>{driftDetected ? dataComparisonYesLabel : dataComparisonNoLabel}</span>;
      },
    },
    {
      field: 'similarityTestPValue',
      name: (
        <EuiToolTip
          content={i18n.translate('xpack.dataVisualizer.dataDrift.pValueTooltip', {
            defaultMessage:
              'Indicates how extreme the change is. Lower values indicate greater change.',
          })}
        >
          <span>
            {i18n.translate('xpack.dataVisualizer.dataDrift.pValueLabel', {
              defaultMessage: 'Similarity p-value',
            })}
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      'data-test-subj': 'mlDataDriftOverviewTableSimilarityTestPValue',
      sortable: true,
      textOnly: true,
      render: (similarityTestPValue: number) => {
        return <span>{formatSignificanceLevel(similarityTestPValue)}</span>;
      },
    },
    {
      field: 'referenceHistogram',
      name: referenceDistributionLabel,
      'data-test-subj': 'mlDataDriftOverviewTableReferenceDistribution',
      sortable: false,
      render: (referenceHistogram: Feature['referenceHistogram'], item) => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <SingleDistributionChart
              fieldType={item.fieldType}
              data={referenceHistogram}
              color={colors.referenceColor}
              name={referenceDistributionLabel}
              secondaryType={item.secondaryType}
            />
          </div>
        );
      },
    },
    {
      field: 'comparisonHistogram',
      name: comparisonDistributionLabel,
      'data-test-subj': 'mlDataDriftOverviewTableDataComparisonDistributionChart',
      sortable: false,
      render: (comparisonDistribution: Feature['comparisonHistogram'], item) => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <SingleDistributionChart
              fieldType={item.fieldType}
              data={comparisonDistribution}
              color={colors.comparisonColor}
              name={comparisonDistributionLabel}
              secondaryType={item.secondaryType}
            />
          </div>
        );
      },
    },
    {
      field: 'comparisonDistribution',
      name: 'Comparison',
      'data-test-subj': 'mlDataDriftOverviewTableDataComparisonDistributionChart',
      sortable: false,
      render: (comparisonDistribution: Feature['comparisonDistribution'], item) => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <OverlapDistributionComparison
              fieldName={item.featureName}
              fieldType={item.fieldType}
              data={comparisonDistribution}
              colors={colors}
              secondaryType={item.secondaryType}
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
      itemIdToExpandedRowMapValues[item.featureName] = (
        <DataDriftDistributionChart
          item={item}
          colors={colors}
          secondaryType={item.secondaryType}
        />
      );
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const tableMessage = useMemo(() => {
    switch (status) {
      case FETCH_STATUS.NOT_INITIATED:
        return i18n.translate('xpack.dataVisualizer.dataDrift.dataComparisonRunAnalysisMsg', {
          defaultMessage: 'Run analysis to compare reference and comparison data',
        });
      case FETCH_STATUS.LOADING:
        return i18n.translate('xpack.dataVisualizer.dataDrift.dataComparisonLoadingMsg', {
          defaultMessage: 'Analyzing',
        });
      default:
        return undefined;
    }
  }, [status]);

  return (
    <EuiInMemoryTable<Feature>
      data-test-subj="mlDataDriftTable"
      tableCaption={i18n.translate('xpack.dataVisualizer.dataDrift.dataDriftTableCaption', {
        defaultMessage: 'Data drift overview',
      })}
      items={data}
      rowHeader="featureName"
      columns={columns}
      rowProps={getRowProps}
      cellProps={getCellProps}
      itemId="featureName"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      sorting={sorting}
      onChange={onTableChange}
      pagination={pagination}
      loading={status === FETCH_STATUS.LOADING}
      message={tableMessage}
    />
  );
};
