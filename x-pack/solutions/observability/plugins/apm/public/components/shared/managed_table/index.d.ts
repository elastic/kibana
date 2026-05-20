import { type EuiBasicTableColumn } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import type { EuiTableRowCellProps, EuiTableActionsColumnType } from '@elastic/eui';
import { type TableActions } from './table_actions';
type SortDirection = 'asc' | 'desc';
/**
 * A tuple of the start and end indices for all visible/rendered items
 * for the `ManagedTable` component.
 */
export type VisibleItemsStartEnd = readonly [number, number];
export interface TableOptions<T> {
    page: {
        index: number;
        size: number;
    };
    sort: {
        direction: SortDirection;
        field: keyof T;
    };
}
export interface ITableColumn<T extends object> {
    name: ReactNode;
    actions?: EuiTableActionsColumnType<T>['actions'];
    field?: string;
    dataType?: string;
    align?: string;
    className?: string;
    width?: string;
    minWidth?: string;
    maxWidth?: string;
    sortable?: boolean;
    truncateText?: EuiTableRowCellProps['truncateText'];
    nameTooltip?: EuiBasicTableColumn<T>['nameTooltip'];
    render?: (value: any, item: T) => unknown;
}
export interface TableSearchBar<T> {
    isEnabled: boolean;
    fieldsToSearch: Array<keyof T>;
    maxCountExceeded: boolean;
    placeholder: string;
    onChangeSearchQuery?: (searchQuery: string) => void;
    techPreview?: boolean;
}
export type { TableActionItem, TableActionSubItem, TableAction, TableActionGroup, TableActions, } from './table_actions';
export { resolveTableActions } from './table_actions';
export type SortFunction<T> = (items: T[], sortField: keyof T, sortDirection: SortDirection) => T[];
export declare const shouldfetchServer: ({ maxCountExceeded, newSearchQuery, oldSearchQuery, }: {
    maxCountExceeded: boolean;
    newSearchQuery: string;
    oldSearchQuery: string;
}) => boolean;
declare function UnoptimizedManagedTable<T extends object>(props: {
    items: T[];
    columns: Array<ITableColumn<T>>;
    rowHeader?: string | false;
    noItemsMessage?: React.ReactNode;
    isLoading?: boolean;
    error?: boolean;
    pagination?: boolean;
    initialPageSize: number;
    initialPageIndex?: number;
    initialSortField?: string;
    initialSortDirection?: SortDirection;
    showPerPageOptions?: boolean;
    onChangeRenderedItems?: (renderedItems: T[]) => void;
    onChangeSorting?: (sorting: TableOptions<T>['sort']) => void;
    onChangeItemIndices?: (range: VisibleItemsStartEnd) => void;
    sortItems?: boolean;
    sortFn?: SortFunction<T>;
    tableLayout?: 'auto' | 'fixed';
    tableSearchBar?: TableSearchBar<T>;
    saveTableOptionsToUrl?: boolean;
    tableCaption?: string;
    actions?: TableActions<T>;
    isActionsDisabled?: (item: T) => boolean;
    rowProps?: (item: T) => Record<string, unknown>;
    'data-test-subj'?: string;
}): React.JSX.Element;
declare const ManagedTable: typeof UnoptimizedManagedTable;
export { ManagedTable, UnoptimizedManagedTable };
