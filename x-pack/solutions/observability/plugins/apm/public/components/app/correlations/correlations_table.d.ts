import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { EuiTableSortingType } from '@elastic/eui/src/components/basic_table/table_types';
import type { Criteria } from '@elastic/eui/src/components/basic_table/basic_table';
import type { FETCH_STATUS } from '../../../hooks/use_fetcher';
import type { FieldValuePair } from '../../../../common/correlations/types';
interface CorrelationsTableProps<T extends FieldValuePair> {
    significantTerms?: T[];
    status: FETCH_STATUS;
    percentageColumnName?: string;
    setPinnedSignificantTerm?: (term: T | null) => void;
    setSelectedSignificantTerm: (term: T | null) => void;
    selectedTerm?: FieldValuePair;
    onFilter?: () => void;
    columns: Array<EuiBasicTableColumn<T>>;
    rowHeader?: string;
    onTableChange: (c: Criteria<T>) => void;
    sorting?: EuiTableSortingType<T>;
}
export declare function CorrelationsTable<T extends FieldValuePair>({ significantTerms, status, setPinnedSignificantTerm, setSelectedSignificantTerm, columns, selectedTerm, onTableChange, sorting, rowHeader, }: CorrelationsTableProps<T>): React.JSX.Element;
export {};
