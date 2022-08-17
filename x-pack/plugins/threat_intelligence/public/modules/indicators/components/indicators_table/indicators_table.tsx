/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC, useState, useMemo } from 'react';
import {
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { DataView } from '@kbn/data-views-plugin/common';
import { Indicator, RawIndicatorFieldId } from '../../../../../common/types/indicator';
import { UseIndicatorsValue } from '../../hooks/use_indicators';
import { cellRendererFactory, ComputedIndicatorFieldId } from './cell_renderer';
import { EmptyState } from '../../../../components/empty_state';
import { IndicatorsTableContext, IndicatorsTableContextValue } from './context';
import { IndicatorsFlyout } from '../indicators_flyout/indicators_flyout';

interface Column {
  id: RawIndicatorFieldId | ComputedIndicatorFieldId;
  displayAsText: string;
}

const columns: Column[] = [
  {
    id: ComputedIndicatorFieldId.DisplayValue,
    displayAsText: i18n.translate('xpack.threatIntelligence.indicator.table.indicatorColumTitle', {
      defaultMessage: 'Indicator',
    }),
  },
  {
    id: RawIndicatorFieldId.Type,
    displayAsText: i18n.translate(
      'xpack.threatIntelligence.indicator.table.indicatorTypeColumTitle',
      {
        defaultMessage: 'Indicator type',
      }
    ),
  },
  {
    id: RawIndicatorFieldId.Feed,
    displayAsText: i18n.translate('xpack.threatIntelligence.indicator.table.FeedColumTitle', {
      defaultMessage: 'Feed',
    }),
  },
  {
    id: RawIndicatorFieldId.FirstSeen,
    displayAsText: i18n.translate('xpack.threatIntelligence.indicator.table.firstSeenColumTitle', {
      defaultMessage: 'First seen',
    }),
  },
  {
    id: RawIndicatorFieldId.LastSeen,
    displayAsText: i18n.translate('xpack.threatIntelligence.indicator.table.lastSeenColumTitle', {
      defaultMessage: 'Last seen',
    }),
  },
  {
    id: RawIndicatorFieldId.MarkingTLP,
    displayAsText: i18n.translate(
      'xpack.threatIntelligence.indicator.table.tlpMarketingColumTitle',
      {
        defaultMessage: 'TLP Marking',
      }
    ),
  },
];

export type IndicatorsTableProps = Omit<UseIndicatorsValue, 'handleRefresh'> & {
  indexPatterns: DataView[];
};

export const TABLE_TEST_ID = 'tiIndicatorsTable';

export const IndicatorsTable: VFC<IndicatorsTableProps> = ({
  indicators,
  indicatorCount,
  onChangePage,
  onChangeItemsPerPage,
  pagination,
  loading,
  indexPatterns,
}) => {
  const [visibleColumns, setVisibleColumns] = useState<Array<Column['id']>>(
    columns.map((column) => column.id)
  );

  const [expanded, setExpanded] = useState<Indicator>();

  const renderCellValue = useMemo(
    () => cellRendererFactory(pagination.pageIndex * pagination.pageSize),
    [pagination.pageIndex, pagination.pageSize]
  );

  // field name to field type map to allow the cell_renderer to format dates
  const fieldTypesMap: { [id: string]: string } = useMemo(() => {
    if (!indexPatterns || indexPatterns.length === 0) return {};

    const res: { [id: string]: string } = {};
    indexPatterns[0].fields.map((field) => (res[field.name] = field.type));
    return res;
  }, [indexPatterns]);

  const indicatorTableContextValue = useMemo<IndicatorsTableContextValue>(
    () => ({ expanded, setExpanded, indicators, fieldTypesMap }),
    [expanded, indicators, fieldTypesMap]
  );

  const start = pagination.pageIndex * pagination.pageSize;
  const end = start + pagination.pageSize;

  const flyoutFragment = useMemo(
    () =>
      expanded ? (
        <IndicatorsFlyout
          indicator={expanded}
          fieldTypesMap={fieldTypesMap}
          closeFlyout={() => setExpanded(undefined)}
        />
      ) : null,
    [expanded, fieldTypesMap]
  );

  const leadingControlColumns = useMemo(
    () => [
      {
        id: 'Actions',
        width: 72,
        headerCellRender: () => (
          <FormattedMessage
            id="xpack.threatIntelligence.indicator.table.actionColumnLabel"
            defaultMessage="Actions"
          />
        ),
        rowCellRender: renderCellValue,
      },
    ],
    [renderCellValue]
  );

  if (loading) {
    return (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiPanel hasShadow={false} hasBorder={false} paddingSize="xl">
            <EuiLoadingSpinner size="xl" />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!indicatorCount) {
    return <EmptyState />;
  }

  return (
    <div>
      <IndicatorsTableContext.Provider value={indicatorTableContextValue}>
        <EuiDataGrid
          aria-labelledby={'indicators-table'}
          leadingControlColumns={leadingControlColumns}
          columns={columns}
          columnVisibility={{
            visibleColumns,
            setVisibleColumns: setVisibleColumns as (cols: string[]) => void,
          }}
          rowCount={indicatorCount}
          renderCellValue={renderCellValue}
          toolbarVisibility={{
            showDisplaySelector: false,
            showFullScreenSelector: false,
            additionalControls: {
              left: {
                prepend: (
                  <EuiText style={{ display: 'inline' }} size="xs">
                    Showing {start + 1}-{end > indicatorCount ? indicatorCount : end} of{' '}
                    {indicatorCount} indicators
                  </EuiText>
                ),
              },
            },
          }}
          pagination={{
            ...pagination,
            onChangeItemsPerPage,
            onChangePage,
          }}
          gridStyle={{
            border: 'horizontal',
            header: 'underline',
            cellPadding: 'm',
            fontSize: 's',
          }}
          data-test-subj={TABLE_TEST_ID}
        />
        {flyoutFragment}
      </IndicatorsTableContext.Provider>
    </div>
  );
};
