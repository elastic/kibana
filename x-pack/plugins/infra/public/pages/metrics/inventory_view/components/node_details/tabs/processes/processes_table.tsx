/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiTable,
  EuiTableHeader,
  EuiTableBody,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
  EuiSpacer,
  EuiTablePagination,
  EuiButtonEmpty,
  EuiCode,
  EuiLoadingChart,
  Query,
  SortableProperties,
  SortableProperty,
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { ProcessListAPIResponse } from '../../../../../../../../common/http_api';
import { FORMATTERS } from '../../../../../../../../common/formatters';
import { euiStyled } from '../../../../../../../../../observability/public';
import { parseProcessList } from './parse_process_list';
import { StateBadge } from './state_badge';
import { STATE_ORDER } from './states';

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = ONE_MINUTE * 60;

interface TableBodyProps {
  processList: ProcessListAPIResponse;
  currentTime: number;
}

type TableProps = TableBodyProps & { isLoading: boolean; searchFilter: Query };

function useSortableProperties<T>(
  sortablePropertyItems: SortableProperty[],
  defaultSortProperty: string
) {
  const [sortableProperties] = useState<SortableProperties<T>>(
    new SortableProperties(sortablePropertyItems, defaultSortProperty)
  );
  const [sortedColumn, setSortedColumn] = useState(
    omit(sortableProperties.getSortedProperty(), 'getValue')
  );

  return {
    setSortedColumn: useCallback(
      (property) => {
        sortableProperties.sortOn(property);
        setSortedColumn(omit(sortableProperties.getSortedProperty(), 'getValue'));
      },
      [sortableProperties]
    ),
    sortedColumn,
    sortItems: (items: T[]) => sortableProperties.sortItems(items),
  };
}

export const ProcessesTable = ({
  processList,
  currentTime,
  isLoading,
  searchFilter,
}: TableProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  useEffect(() => setCurrentPage(0), [processList, itemsPerPage]);

  const { sortedColumn, sortItems, setSortedColumn } = useSortableProperties<
    ProcessListAPIResponse
  >(
    [
      {
        name: 'state',
        getValue: (item: any) => STATE_ORDER.indexOf(item.state),
        isAscending: true,
      },
      {
        name: 'command',
        getValue: (item: any) => item.command.toLowerCase(),
        isAscending: true,
      },
      {
        name: 'startTime',
        getValue: (item: any) => Date.parse(item.startTime),
        isAscending: true,
      },
      {
        name: 'cpu',
        getValue: (item: any) => item.cpu,
        isAscending: true,
      },
      {
        name: 'memory',
        getValue: (item: any) => item.memory,
        isAscending: true,
      },
    ],
    'state'
  );

  const currentItems = useMemo(() => {
    const filteredItems = Query.execute(searchFilter, parseProcessList(processList));
    if (!filteredItems.length) return [];
    const sortedItems = sortItems(filteredItems);
    return sortedItems;
  }, [processList, searchFilter, sortItems]);

  const pageCount = useMemo(() => Math.ceil(currentItems.length / itemsPerPage), [
    itemsPerPage,
    currentItems,
  ]);

  const pageStartIdx = useMemo(() => currentPage * itemsPerPage + (currentPage > 0 ? 1 : 0), [
    currentPage,
    itemsPerPage,
  ]);
  const currentItemsPage = useMemo(
    () => currentItems.slice(pageStartIdx, pageStartIdx + itemsPerPage),
    [pageStartIdx, currentItems, itemsPerPage]
  );

  const body = !isLoading ? (
    <ProcessesTableBody processList={currentItemsPage} currentTime={currentTime} />
  ) : (
    <LoadingTableBody />
  );
  return (
    <>
      <EuiTable>
        <EuiTableHeader>
          <EuiTableHeaderCell width={24} />
          {columns.map((column) => (
            <EuiTableHeaderCell
              key={column.field}
              align={column.align ?? LEFT_ALIGNMENT}
              width={column.width}
              onSort={column.sortable ? () => setSortedColumn(column.field) : undefined}
              isSorted={sortedColumn.name === column.field}
              isSortAscending={sortedColumn.name === column.field && sortedColumn.isAscending}
            >
              {column.name}
            </EuiTableHeaderCell>
          ))}
        </EuiTableHeader>
        <StyledTableBody>{body}</StyledTableBody>
      </EuiTable>
      <EuiSpacer size="m" />
      <EuiTablePagination
        itemsPerPage={itemsPerPage}
        activePage={currentPage}
        pageCount={pageCount}
        itemsPerPageOptions={[10, 20, 50]}
        onChangePage={setCurrentPage}
        onChangeItemsPerPage={setItemsPerPage}
      />
    </>
  );
};

const LoadingTableBody = () => {
  return (
    <div
      style={{
        width: '100%',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <EuiLoadingChart size="xl" />
    </div>
  );
};

const ProcessesTableBody = ({ processList, currentTime }: TableBodyProps) => (
  <>
    {processList.map((item, i) => {
      const cells = columns.map((column) => (
        <EuiTableRowCell
          key={`${column.field}-${i}`}
          header={column.name}
          align={column.align ?? LEFT_ALIGNMENT}
        >
          {column.render ? column.render(item[column.field], currentTime) : item[column.field]}
        </EuiTableRowCell>
      ));
      return (
        <EuiTableRow key={`row-${i}`}>
          <EuiTableRowCell>
            <EuiButtonEmpty iconType="arrowRight" />
          </EuiTableRowCell>
          {cells}
        </EuiTableRow>
      );
    })}
  </>
);

const RuntimeCell = ({ startTime, currentTime }: { startTime: string; currentTime: number }) => {
  const runtimeLength = currentTime - Date.parse(startTime);
  let remainingRuntimeMS = runtimeLength;
  const runtimeHours = Math.floor(remainingRuntimeMS / ONE_HOUR);
  remainingRuntimeMS -= runtimeHours * ONE_HOUR;
  const runtimeMinutes = Math.floor(remainingRuntimeMS / ONE_MINUTE);
  remainingRuntimeMS -= runtimeMinutes * ONE_MINUTE;
  const runtimeSeconds = Math.floor(remainingRuntimeMS / 1000);
  remainingRuntimeMS -= runtimeSeconds * 1000;

  const runtimeDisplayHours = runtimeHours ? `${runtimeHours}:` : '';
  const runtimeDisplayMinutes = runtimeMinutes < 10 ? `0${runtimeMinutes}:` : `${runtimeMinutes}:`;
  const runtimeDisplaySeconds = runtimeSeconds < 10 ? `0${runtimeSeconds}` : runtimeSeconds;

  return <>{`${runtimeDisplayHours}${runtimeDisplayMinutes}${runtimeDisplaySeconds}`}</>;
};

const StyledTableBody = euiStyled(EuiTableBody)`
  & .euiTableCellContent {
    padding-top: 0;
    padding-bottom: 0;
    
  }
`;

const CodeLine = euiStyled(EuiCode).attrs({ transparentBackground: true })`
  text-overflow: ellipsis;
  overflow: hidden;
  & code.euiCodeBlock__code {
    white-space: nowrap !important;
    vertical-align: middle;
  }
`;

const columns: Array<{
  field: string;
  name: string;
  sortable: boolean;
  render?: Function;
  width?: string | number;
  align?: typeof RIGHT_ALIGNMENT | typeof LEFT_ALIGNMENT;
}> = [
  {
    field: 'state',
    name: i18n.translate('xpack.infra.metrics.nodeDetails.processes.columnLabelState', {
      defaultMessage: 'State',
    }),
    sortable: true,
    render: (state: string) => <StateBadge state={state} />,
    width: 84,
  },
  {
    field: 'command',
    name: i18n.translate('xpack.infra.metrics.nodeDetails.processes.columnLabelCommand', {
      defaultMessage: 'Command',
    }),
    sortable: true,
    width: '40%',
    render: (command: string) => <CodeLine>{command}</CodeLine>,
  },
  {
    field: 'startTime',
    name: i18n.translate('xpack.infra.metrics.nodeDetails.processes.columnLabelTime', {
      defaultMessage: 'Time',
    }),
    align: RIGHT_ALIGNMENT,
    sortable: true,
    render: (startTime: string, currentTime: number) => (
      <RuntimeCell startTime={startTime} currentTime={currentTime} />
    ),
  },
  {
    field: 'cpu',
    name: i18n.translate('xpack.infra.metrics.nodeDetails.processes.columnLabelCPU', {
      defaultMessage: 'CPU',
    }),
    sortable: true,
    render: (value: number) => FORMATTERS.percent(value),
  },
  {
    field: 'memory',
    name: i18n.translate('xpack.infra.metrics.nodeDetails.processes.columnLabelMemory', {
      defaultMessage: 'Mem.',
    }),
    sortable: true,
    render: (value: number) => FORMATTERS.percent(value),
  },
];
