/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn, EuiContextMenuPanelDescriptor } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenu,
  useEuiTheme,
} from '@elastic/eui';
import { isEmpty, merge, orderBy } from 'lodash';
import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ProgressiveLoadingQuality, apmProgressiveLoading } from '@kbn/observability-plugin/common';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { fromQuery, toQuery } from '../links/url_helpers';
import {
  getItemsFilteredBySearchQuery,
  TableSearchBar,
} from '../table_search_bar/table_search_bar';

type SortDirection = 'asc' | 'desc';

/**
 * A tuple of the start and end indices for all visible/rendered items
 * for the `ManagedTable` component.
 */
export type VisibleItemsStartEnd = readonly [number, number];

export interface TableOptions<T> {
  page: { index: number; size: number };
  sort: { direction: SortDirection; field: keyof T };
}

// TODO: this should really be imported from EUI
export interface ITableColumn<T extends object> {
  name: ReactNode;
  actions?: Array<Record<string, unknown>>;
  field?: string;
  dataType?: string;
  align?: string;
  width?: string;
  sortable?: boolean;
  truncateText?: boolean;
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

export interface TableActionSubItem<T> {
  id: string;
  name: string;
  onClick?: (item: T) => void;
  href?: (item: T) => string | undefined;
  icon?: string;
}

export interface TableAction<T> {
  id: string;
  name: string;
  onClick?: (item: T) => void;
  href?: (item: T) => string | undefined;
  icon?: string;
  items?: Array<TableActionSubItem<T>>;
}

export interface TableActionGroup<T> {
  id: string;
  groupLabel?: string;
  actions: Array<TableAction<T>>;
}

export type TableActions<T> = Array<TableActionGroup<T>>;

function ActionsCell<T extends object>({
  item,
  actions,
  disabled = false,
}: {
  item: T;
  actions: TableActions<T>;
  disabled?: boolean;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activePanelId, setActivePanelId] = useState(0);
  const { euiTheme } = useEuiTheme();

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((prev) => !prev);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
    setActivePanelId(0);
  }, []);

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
    const mainPanelItems: EuiContextMenuPanelDescriptor['items'] = [];
    const subPanels: EuiContextMenuPanelDescriptor[] = [];
    let subPanelId = 1;

    for (const [groupIndex, group] of actions.entries()) {
      // Add group header if it exists
      if (group.groupLabel) {
        mainPanelItems.push({
          name: group.groupLabel,
          disabled: true,
          css: {
            fontWeight: 700,
            color: euiTheme.colors.text,
            borderBottom: euiTheme.border.thin,
            marginTop: groupIndex > 0 ? euiTheme.size.m : 0,
          },
          'data-test-subj': `apmManagedTableActionsMenuGroup-${group.id}`,
        });
      }

      // Add action items
      for (const action of group.actions) {
        const hasSubItems = action.items && action.items.length > 0;

        if (hasSubItems) {
          const panelId = subPanelId++;

          mainPanelItems.push({
            name: action.name,
            icon: action.icon,
            panel: panelId,
            'data-test-subj': `apmManagedTableActionsMenuItem-${action.id}`,
          });

          subPanels.push({
            id: panelId,
            title: action.name,
            items: action.items!.map((subItem) => ({
              name: subItem.name,
              icon: subItem.icon,
              ...(subItem.href
                ? { href: subItem.href(item), target: '_self' }
                : {
                    onClick: () => {
                      subItem.onClick?.(item);
                      closePopover();
                    },
                  }),
              'data-test-subj': `apmManagedTableActionsMenuItem-${subItem.id}`,
            })),
          });
        } else {
          mainPanelItems.push({
            name: action.name,
            icon: action.icon,
            ...(action.href
              ? { href: action.href(item), target: '_self' }
              : {
                  onClick: action.onClick
                    ? () => {
                        action.onClick!(item);
                        closePopover();
                      }
                    : undefined,
                }),
            'data-test-subj': `apmManagedTableActionsMenuItem-${action.id}`,
          });
        }
      }
    }

    return [{ id: 0, items: mainPanelItems }, ...subPanels];
  }, [actions, item, closePopover, euiTheme]);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          data-test-subj="apmManagedTableActionsCellButton"
          aria-label={i18n.translate('xpack.apm.managedTable.actionsAriaLabel', {
            defaultMessage: 'Actions',
          })}
          iconType="boxesVertical"
          onClick={togglePopover}
          color="text"
          isDisabled={disabled}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenu initialPanelId={activePanelId} panels={panels} />
    </EuiPopover>
  );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function defaultSortFn<T>(items: T[], sortField: keyof T, sortDirection: SortDirection) {
  return orderBy(items, sortField, sortDirection) as T[];
}

export type SortFunction<T> = (items: T[], sortField: keyof T, sortDirection: SortDirection) => T[];

export const shouldfetchServer = ({
  maxCountExceeded,
  newSearchQuery,
  oldSearchQuery,
}: {
  maxCountExceeded: boolean;
  newSearchQuery: string;
  oldSearchQuery: string;
}) => maxCountExceeded || !newSearchQuery.includes(oldSearchQuery);

function UnoptimizedManagedTable<T extends object>(props: {
  items: T[];
  columns: Array<ITableColumn<T>>;
  rowHeader?: string | false;
  noItemsMessage?: React.ReactNode;
  isLoading?: boolean;
  error?: boolean;

  // pagination
  pagination?: boolean;
  initialPageSize: number;
  initialPageIndex?: number;
  initialSortField?: string;
  initialSortDirection?: SortDirection;
  showPerPageOptions?: boolean;

  // onChange handlers
  onChangeRenderedItems?: (renderedItems: T[]) => void;
  onChangeSorting?: (sorting: TableOptions<T>['sort']) => void;
  onChangeItemIndices?: (range: VisibleItemsStartEnd) => void;

  // sorting
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
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const history = useHistory();
  const {
    services: { uiSettings },
  } = useKibana();
  const progressiveLoadingQuality =
    uiSettings?.get<ProgressiveLoadingQuality>(apmProgressiveLoading) ??
    ProgressiveLoadingQuality.off;

  const {
    items,
    columns,
    rowHeader,
    noItemsMessage,
    isLoading = false,
    error = false,

    // pagination
    pagination = true,
    initialPageIndex = 0,
    initialPageSize = 10,
    initialSortField = props.columns[0]?.field || '',
    initialSortDirection = 'asc',
    showPerPageOptions = true,

    // onChange handlers
    onChangeRenderedItems,
    onChangeSorting,
    onChangeItemIndices,

    // sorting
    sortItems = true,
    sortFn = defaultSortFn,

    saveTableOptionsToUrl = true,
    tableLayout,
    tableSearchBar = {
      isEnabled: false,
      fieldsToSearch: [],
      maxCountExceeded: false,
      placeholder: i18n.translate('xpack.apm.managedTable.searchPlaceholder', {
        defaultMessage: 'Search...',
      }),
      onChangeSearchQuery: () => {},
    },
    actions,
    isActionsDisabled,
  } = props;

  const columnsWithActions = useMemo(() => {
    if (!actions || actions.length === 0) {
      return columns;
    }

    const actionsColumn: ITableColumn<T> = {
      name: i18n.translate('xpack.apm.managedTable.actionsColumnName', {
        defaultMessage: 'Actions',
      }),
      width: '80px',
      align: 'center',
      render: (item: T) => (
        <ActionsCell
          item={item}
          actions={actions}
          disabled={isActionsDisabled ? isActionsDisabled(item) : false}
        />
      ),
    };

    return [...columns, actionsColumn];
  }, [columns, actions, isActionsDisabled]);

  const {
    urlParams: {
      page: urlPageIndex = initialPageIndex,
      pageSize: urlPageSize = initialPageSize,
      sortField: urlSortField = initialSortField,
      sortDirection: urlSortDirection = initialSortDirection,
    },
  } = useLegacyUrlParams();

  const getStateFromUrl = useCallback(
    (): TableOptions<T> => ({
      page: { index: urlPageIndex, size: urlPageSize },
      sort: {
        field: urlSortField as keyof T,
        direction: urlSortDirection as SortDirection,
      },
    }),
    [urlPageIndex, urlPageSize, urlSortField, urlSortDirection]
  );

  // initialise table options state from url params
  const [tableOptions, setTableOptions] = useState(getStateFromUrl());

  // update table options state when url params change
  useEffect(() => {
    // Prevent updates while data is loading, as this cause pagination issues when observability:apmProgressiveLoading is enabled
    if (
      (progressiveLoadingQuality === ProgressiveLoadingQuality.off || !isLoading) &&
      saveTableOptionsToUrl
    ) {
      setTableOptions(getStateFromUrl());
    }
  }, [getStateFromUrl, progressiveLoadingQuality, isLoading, saveTableOptionsToUrl]);

  // Clean up searchQuery when fast filter is toggled off
  useEffect(() => {
    if (!tableSearchBar.isEnabled) {
      setSearchQuery('');
    }
  }, [tableSearchBar.isEnabled]);

  // update table options state when `onTableChange` is invoked and persist to url
  const onTableChange = useCallback(
    (newTableOptions: Partial<TableOptions<T>>) => {
      setTableOptions((oldTableOptions) => merge({}, oldTableOptions, newTableOptions));

      if (
        saveTableOptionsToUrl &&
        (progressiveLoadingQuality === ProgressiveLoadingQuality.off || !isLoading)
      ) {
        history.push({
          ...history.location,
          search: fromQuery({
            ...toQuery(history.location.search),
            page: newTableOptions.page?.index,
            pageSize: newTableOptions.page?.size,
            sortField: newTableOptions.sort?.field,
            sortDirection: newTableOptions.sort?.direction,
          }),
        });
      }
    },
    [history, saveTableOptionsToUrl, setTableOptions, progressiveLoadingQuality, isLoading]
  );

  const filteredItems = useMemo(() => {
    return isEmpty(searchQuery)
      ? items
      : getItemsFilteredBySearchQuery({
          items,
          fieldsToSearch: tableSearchBar.fieldsToSearch,
          searchQuery,
        });
  }, [items, searchQuery, tableSearchBar.fieldsToSearch]);

  const renderedIndices = useMemo<VisibleItemsStartEnd>(
    () => [
      tableOptions.page.index * tableOptions.page.size,
      (tableOptions.page.index + 1) * tableOptions.page.size,
    ],
    [tableOptions.page.index, tableOptions.page.size]
  );

  const renderedItems = useMemo(() => {
    const sortedItems = sortItems
      ? sortFn(filteredItems, tableOptions.sort.field as keyof T, tableOptions.sort.direction)
      : filteredItems;

    return sortedItems.slice(...renderedIndices);
  }, [
    sortItems,
    sortFn,
    filteredItems,
    tableOptions.sort.field,
    tableOptions.sort.direction,
    renderedIndices,
  ]);

  useEffect(() => {
    onChangeRenderedItems?.(renderedItems);
  }, [onChangeRenderedItems, renderedItems]);

  useEffect(() => {
    onChangeItemIndices?.(renderedIndices);
  }, [onChangeItemIndices, renderedIndices]);

  const sorting = useMemo(
    () => ({ sort: tableOptions.sort as TableOptions<T>['sort'] }),
    [tableOptions.sort]
  );

  useEffect(() => onChangeSorting?.(sorting.sort), [onChangeSorting, sorting]);

  const paginationProps = useMemo(() => {
    if (!pagination) {
      return;
    }
    return {
      showPerPageOptions,
      totalItemCount: filteredItems.length,
      pageIndex: tableOptions.page.index,
      pageSize: tableOptions.page.size,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    };
  }, [
    pagination,
    showPerPageOptions,
    filteredItems.length,
    tableOptions.page.index,
    tableOptions.page.size,
  ]);

  const onChangeSearchQuery = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (
        shouldfetchServer({
          maxCountExceeded: tableSearchBar.maxCountExceeded,
          newSearchQuery: value,
          oldSearchQuery: searchQuery,
        })
      ) {
        tableSearchBar.onChangeSearchQuery?.(value);
      }
    },
    [searchQuery, tableSearchBar]
  );

  return (
    <EuiFlexGroup
      gutterSize="xs"
      direction="column"
      responsive={false}
      data-test-subj={props['data-test-subj']}
    >
      {tableSearchBar.isEnabled ? (
        <EuiFlexItem>
          <TableSearchBar
            placeholder={tableSearchBar.placeholder}
            searchQuery={searchQuery}
            onChangeSearchQuery={onChangeSearchQuery}
            techPreview={tableSearchBar.techPreview}
            isLoading={isLoading}
          />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem>
        <EuiBasicTable<T>
          loading={isLoading}
          tableLayout={tableLayout}
          error={
            error
              ? i18n.translate('xpack.apm.managedTable.errorMessage', {
                  defaultMessage: 'Failed to fetch',
                })
              : ''
          }
          noItemsMessage={
            isLoading
              ? i18n.translate('xpack.apm.managedTable.loadingDescription', {
                  defaultMessage: 'Loading…',
                })
              : noItemsMessage
          }
          items={renderedItems}
          columns={columnsWithActions as unknown as Array<EuiBasicTableColumn<T>>}
          rowHeader={rowHeader === false ? undefined : rowHeader ?? columns[0]?.field}
          sorting={sorting}
          onChange={onTableChange}
          tableCaption={props.tableCaption}
          rowProps={props.rowProps}
          {...(paginationProps ? { pagination: paginationProps } : {})}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const ManagedTable = React.memo(UnoptimizedManagedTable) as typeof UnoptimizedManagedTable;

export { ManagedTable, UnoptimizedManagedTable };
