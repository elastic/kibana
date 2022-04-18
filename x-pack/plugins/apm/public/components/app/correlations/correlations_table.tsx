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
import { useUiTracker } from '@kbn/observability-plugin/public';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import type { FieldValuePair } from '../../../../common/correlations/types';

const PAGINATION_SIZE_OPTIONS = [5, 10, 20, 50];

interface CorrelationsTableProps<T extends FieldValuePair> {
  significantTerms?: T[];
  status: FETCH_STATUS;
  percentageColumnName?: string;
  setPinnedSignificantTerm?: (term: T | null) => void;
  setSelectedSignificantTerm: (term: T | null) => void;
  selectedTerm?: FieldValuePair;
  onFilter?: () => void;
  columns: Array<EuiBasicTableColumn<T>>;
  onTableChange: (c: Criteria<T>) => void;
  sorting?: EuiTableSortingType<T>;
}

export function CorrelationsTable<T extends FieldValuePair>({
  significantTerms,
  status,
  setPinnedSignificantTerm,
  setSelectedSignificantTerm,
  columns,
  selectedTerm,
  onTableChange,
  sorting,
}: CorrelationsTableProps<T>) {
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
      error={status === FETCH_STATUS.FAILURE ? errorMessage : ''}
      columns={columns}
      rowProps={(term) => {
        return {
          onClick: () => {
            if (setPinnedSignificantTerm) {
              setPinnedSignificantTerm(term);
            }
          },
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
  { defaultMessage: 'Loading...' }
);

const noDataText = i18n.translate(
  'xpack.apm.correlations.correlationsTable.noDataText',
  { defaultMessage: 'No data' }
);

const errorMessage = i18n.translate(
  'xpack.apm.correlations.correlationsTable.errorMessage',
  { defaultMessage: 'Failed to fetch' }
);
