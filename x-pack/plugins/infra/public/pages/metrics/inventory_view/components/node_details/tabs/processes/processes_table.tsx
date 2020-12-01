/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiTable,
  EuiTableHeader,
  EuiTableBody,
  EuiTableHeaderCell,
  EuiTableRowCell,
  EuiLoadingChart,
  EuiEmptyPrompt,
  SortableProperties,
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { ProcessListAPIResponse } from '../../../../../../../../common/http_api';
import { FORMATTERS } from '../../../../../../../../common/formatters';
import { euiStyled } from '../../../../../../../../../observability/public';
import { SortBy } from '../../../../hooks/use_process_list';
import { Process } from './types';
import { ProcessRow, CodeLine } from './process_row';
import { StateBadge } from './state_badge';
import { STATE_ORDER } from './states';

interface TableProps {
  processList: ProcessListAPIResponse['processList'];
  currentTime: number;
  isLoading: boolean;
  sortBy: SortBy;
  setSortBy: (s: SortBy) => void;
}

function useSortableProperties<T>(
  sortablePropertyItems: Array<{
    name: string;
    getValue: (obj: T) => any;
    isAscending: boolean;
  }>,
  defaultSortProperty: string,
  callback: (s: SortBy) => void
) {
  const [sortableProperties] = useState<SortableProperties<T>>(
    new SortableProperties(sortablePropertyItems, defaultSortProperty)
  );

  return {
    updateSortableProperties: useCallback(
      (property) => {
        sortableProperties.sortOn(property);
        callback(omit(sortableProperties.getSortedProperty(), 'getValue'));
      },
      [sortableProperties, callback]
    ),
  };
}

export const ProcessesTable = ({
  processList,
  currentTime,
  isLoading,
  sortBy,
  setSortBy,
}: TableProps) => {
  const { updateSortableProperties } = useSortableProperties<Process>(
    [
      {
        name: 'startTime',
        getValue: (item: any) => Date.parse(item.startTime),
        isAscending: true,
      },
      {
        name: 'cpu',
        getValue: (item: any) => item.cpu,
        isAscending: false,
      },
      {
        name: 'memory',
        getValue: (item: any) => item.memory,
        isAscending: false,
      },
    ],
    'cpu',
    setSortBy
  );

  const currentItems = useMemo(
    () =>
      processList.sort(
        (a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state)
      ) as Process[],
    [processList]
  );

  if (isLoading) return <LoadingPlaceholder />;

  if (currentItems.length === 0)
    return (
      <EuiEmptyPrompt
        iconType="tableDensityNormal"
        title={
          <h4>
            {i18n.translate('xpack.infra.metrics.nodeDetails.noProcesses', {
              defaultMessage: 'No processes matched these search terms',
            })}
          </h4>
        }
      />
    );

  return (
    <>
      <EuiTable>
        <EuiTableHeader>
          <EuiTableHeaderCell width={24} />
          {columns.map((column) => (
            <EuiTableHeaderCell
              key={`${String(column.field)}-header`}
              align={column.align ?? LEFT_ALIGNMENT}
              width={column.width}
              onSort={column.sortable ? () => updateSortableProperties(column.field) : undefined}
              isSorted={sortBy.name === column.field}
              isSortAscending={sortBy.name === column.field && sortBy.isAscending}
            >
              {column.name}
            </EuiTableHeaderCell>
          ))}
        </EuiTableHeader>
        <StyledTableBody>
          <ProcessesTableBody items={currentItems} currentTime={currentTime} />
        </StyledTableBody>
      </EuiTable>
    </>
  );
};

const LoadingPlaceholder = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '200px',
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

interface TableBodyProps {
  items: Process[];
  currentTime: number;
}
const ProcessesTableBody = ({ items, currentTime }: TableBodyProps) => (
  <>
    {items.map((item, i) => {
      const cells = columns.map((column) => (
        <EuiTableRowCell
          key={`${String(column.field)}-${i}`}
          header={column.name}
          align={column.align ?? LEFT_ALIGNMENT}
          textOnly={column.textOnly ?? true}
        >
          {column.render ? column.render(item[column.field], currentTime) : item[column.field]}
        </EuiTableRowCell>
      ));
      return <ProcessRow cells={cells} item={item} key={`row-${i}`} />;
    })}
  </>
);

const StyledTableBody = euiStyled(EuiTableBody)`
  & .euiTableCellContent {
    padding-top: 0;
    padding-bottom: 0;
    
  }
`;

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = ONE_MINUTE * 60;
const RuntimeCell = ({ startTime, currentTime }: { startTime: number; currentTime: number }) => {
  const runtimeLength = currentTime - startTime;
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

const columns: Array<{
  field: keyof Process;
  name: string;
  sortable: boolean;
  render?: Function;
  width?: string | number;
  textOnly?: boolean;
  align?: typeof RIGHT_ALIGNMENT | typeof LEFT_ALIGNMENT;
}> = [
  {
    field: 'state',
    name: i18n.translate('xpack.infra.metrics.nodeDetails.processes.columnLabelState', {
      defaultMessage: 'State',
    }),
    sortable: false,
    render: (state: string) => <StateBadge state={state} />,
    width: 84,
    textOnly: false,
  },
  {
    field: 'command',
    name: i18n.translate('xpack.infra.metrics.nodeDetails.processes.columnLabelCommand', {
      defaultMessage: 'Command',
    }),
    sortable: false,
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
    render: (startTime: number, currentTime: number) => (
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
