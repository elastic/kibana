/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseTableState } from '@kbn/ml-in-memory-table';
import React, { ReactNode, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiIcon,
  EuiInMemoryTable,
  EuiScreenReaderOnly,
  EuiTableFieldDataColumnType,
  EuiToolTip,
} from '@elastic/eui';
import { FieldTypeIcon } from '../common/components/field_type_icon';
import { COLLAPSE_ROW, EXPAND_ROW } from '../../../common/i18n_constants';
import { COMPARISON_LABEL, REFERENCE_LABEL } from './constants';
import { useCurrentEuiTheme } from '../common/hooks/use_current_eui_theme';
import { DataComparisonField, Feature, FETCH_STATUS } from './types';
import { formatSignificanceLevel } from './data_comparison_utils';
import { SingleDistributionChart } from './charts/single_distribution_chart';
import { OverlapDistributionComparison } from './charts/overlap_distribution_chart';
import { DataComparisonDistributionChart } from './charts/data_comparison_distribution_chart';

const dataComparisonYesLabel = i18n.translate(
  'xpack.dataVisualizer.dataComparison.fieldTypeYesLabel',
  {
    defaultMessage: 'Yes',
  }
);
const dataComparisonNoLabel = i18n.translate(
  'xpack.dataVisualizer.dataComparison.driftDetectedNoLabel',
  {
    defaultMessage: 'No',
  }
);

export const DataComparisonOverviewTable = ({
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
  const colors = {
    referenceColor: euiTheme.euiColorVis2,
    productionColor: euiTheme.euiColorVis1,
  };
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const referenceDistributionLabel = i18n.translate(
    'xpack.dataVisualizer.dataComparison.dataComparisonDistributionLabel',
    {
      defaultMessage: '{label} distribution',
      values: { label: REFERENCE_LABEL },
    }
  );
  const comparisonDistributionLabel = i18n.translate(
    'xpack.dataVisualizer.dataComparison.dataComparisonDistributionLabel',
    {
      defaultMessage: '{label} distribution',
      values: { label: COMPARISON_LABEL },
    }
  );

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
            onClick={() => toggleDetails(item)}
            aria-label={itemIdToExpandedRowMapValues[item.featureName] ? COLLAPSE_ROW : EXPAND_ROW}
            iconType={itemIdToExpandedRowMapValues[item.featureName] ? 'arrowDown' : 'arrowRight'}
          />
        );
      },
    },

    {
      field: 'featureName',
      name: i18n.translate('xpack.dataVisualizer.dataComparison.fieldNameLabel', {
        defaultMessage: 'Name',
      }),
      'data-test-subj': 'mlDataComparisonOverviewTableFeatureName',
      sortable: true,
      textOnly: true,
    },
    {
      field: 'secondaryType',
      name: i18n.translate('xpack.dataVisualizer.dataComparison.fieldTypeLabel', {
        defaultMessage: 'Type',
      }),
      'data-test-subj': 'mlDataComparisonOverviewTableFeatureType',
      sortable: true,
      textOnly: true,
      render: (secondaryType: DataComparisonField['secondaryType']) => {
        return <FieldTypeIcon type={secondaryType} tooltipEnabled={true} />;
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
        return <span>{driftDetected ? dataComparisonYesLabel : dataComparisonNoLabel}</span>;
      },
    },
    {
      field: 'similarityTestPValue',
      name: (
        <EuiToolTip
          content={i18n.translate('xpack.dataVisualizer.dataComparison.pValueTooltip', {
            defaultMessage:
              'Indicates how extreme the change is. Lower values indicate greater change.',
          })}
        >
          <span>
            {i18n.translate('xpack.dataVisualizer.dataComparison.pValueLabel', {
              defaultMessage: 'Similarity p-value',
            })}
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      'data-test-subj': 'mlDataComparisonOverviewTableSimilarityTestPValue',
      sortable: true,
      textOnly: true,
      render: (similarityTestPValue: number) => {
        return <span>{formatSignificanceLevel(similarityTestPValue)}</span>;
      },
    },
    {
      field: 'referenceHistogram',
      name: referenceDistributionLabel,
      'data-test-subj': 'mlDataComparisonOverviewTableReferenceDistribution',
      sortable: false,
      render: (referenceHistogram: Feature['referenceHistogram'], item) => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <SingleDistributionChart
              fieldType={item.fieldType}
              data={referenceHistogram}
              color={colors.referenceColor}
              name={referenceDistributionLabel}
            />
          </div>
        );
      },
    },
    {
      field: 'productionHistogram',
      name: comparisonDistributionLabel,
      'data-test-subj': 'mlDataComparisonOverviewTableDataComparisonDistributionChart',
      sortable: false,
      render: (productionDistribution: Feature['productionHistogram'], item) => {
        return (
          <div css={{ width: 100, height: 40 }}>
            <SingleDistributionChart
              fieldType={item.fieldType}
              data={productionDistribution}
              color={colors.productionColor}
              name={comparisonDistributionLabel}
            />
          </div>
        );
      },
    },
    {
      field: 'comparisonDistribution',
      name: 'Comparison',
      'data-test-subj': 'mlDataComparisonOverviewTableDataComparisonDistributionChart',
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
          <DataComparisonDistributionChart
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

  const tableMessage = useMemo(() => {
    switch (status) {
      case FETCH_STATUS.NOT_INITIATED:
        return i18n.translate('xpack.dataVisualizer.dataComparison.dataComparisonRunAnalysisMsg', {
          defaultMessage: 'Run analysis to compare reference and comparison data',
        });
      case FETCH_STATUS.LOADING:
        return i18n.translate('xpack.dataVisualizer.dataComparison.dataComparisonLoadingMsg', {
          defaultMessage: 'Analyzing',
        });
      default:
        return undefined;
    }
  }, [status]);

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
      loading={status === FETCH_STATUS.LOADING}
      message={tableMessage}
    />
  );
};
