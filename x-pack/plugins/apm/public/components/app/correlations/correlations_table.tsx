/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EuiTableSortingType } from '@elastic/eui/src/components/basic_table/table_types';
import type { Criteria } from '@elastic/eui/src/components/basic_table/basic_table';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useUiTracker } from '../../../../../observability/public';
import { useTheme } from '../../../hooks/use_theme';
import type { CorrelationsTerm } from '../../../../common/search_strategies/failure_correlations/types';

const PAGINATION_SIZE_OPTIONS = [5, 10, 20, 50];

export type SelectedCorrelationTerm<T extends CorrelationsTerm> = Pick<
  T,
  'fieldName' | 'fieldValue'
>;

interface Props<T> {
  significantTerms?: T[];
  status: FETCH_STATUS;
  percentageColumnName?: string;
  setSelectedSignificantTerm: (term: T | null) => void;
  selectedTerm?: { fieldName: string; fieldValue: string };
  onFilter?: () => void;
  columns: Array<EuiBasicTableColumn<T>>;
  onTableChange: (c: Criteria<T>) => void;
  sorting?: EuiTableSortingType<T>;
}

export function CorrelationsTable<T extends CorrelationsTerm>({
  significantTerms,
  status,
  setSelectedSignificantTerm,
  columns,
  selectedTerm,
  onTableChange,
  sorting,
}: Props<T>) {
  const euiTheme = useTheme();
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const trackSelectSignificantCorrelationTerm = useCallback(
    () =>
      debounce(
        () => trackApmEvent({ metric: 'select_significant_term' }),
        1000
      ),
    [trackApmEvent]
  );

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { pagination, pageOfItems } = useMemo(() => {
    const pageStart = pageIndex * pageSize;

    const itemCount = significantTerms?.length ?? 0;
    return {
      pageOfItems: significantTerms?.slice(pageStart, pageStart + pageSize),
      pagination: {
        pageIndex,
        pageSize,
        totalItemCount: itemCount,
        pageSizeOptions: PAGINATION_SIZE_OPTIONS,
      },
    };
  }, [pageIndex, pageSize, significantTerms]);

  const onChange = useCallback(
    (tableSettings) => {
      const { index, size } = tableSettings.page;

      setPageIndex(index);
      setPageSize(size);

      onTableChange(tableSettings);
    },
    [onTableChange]
  );

  return (
    <EuiBasicTable
      items={pageOfItems ?? []}
      noItemsMessage={
        status === FETCH_STATUS.LOADING ? loadingText : noDataText
      }
      loading={status === FETCH_STATUS.LOADING}
      columns={columns}
      rowProps={(term) => {
        return {
          onMouseEnter: () => {
            setSelectedSignificantTerm(term);
            trackSelectSignificantCorrelationTerm();
          },
          onMouseLeave: () => setSelectedSignificantTerm(null),
          style:
            selectedTerm &&
            selectedTerm.fieldValue === term.fieldValue &&
            selectedTerm.fieldName === term.fieldName
              ? {
                  backgroundColor: euiTheme.eui.euiColorLightestShade,
                }
              : null,
        };
      }}
      pagination={pagination}
      onChange={onChange}
      sorting={sorting}
    />
  );
}

const loadingText = i18n.translate(
  'xpack.apm.correlations.correlationsTable.loadingText',
  { defaultMessage: 'Loading' }
);

const noDataText = i18n.translate(
  'xpack.apm.correlations.correlationsTable.noDataText',
  { defaultMessage: 'No data' }
);
