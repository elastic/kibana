/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
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
  EuiBadge,
  EuiCode,
  EuiLoadingChart,
} from '@elastic/eui';
import { FORMATTERS } from '../../../../../../../common/formatters';
import { euiStyled } from '../../../../../../../../observability/public';
import { useProcessList } from '../../../hooks/use_process_list';
import { TabContent, TabProps } from './shared';

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = ONE_MINUTE * 60;

const TabComponent = ({ currentTime, node, nodeType, options }: TabProps) => {
  const hostTerm = useMemo(() => {
    const field = options.fields[nodeType];
    return { [field]: node.name };
  }, [options, node, nodeType]);

  const { loading, error, response } = useProcessList(
    hostTerm,
    'metricbeat-*',
    options.fields?.timestamp,
    currentTime
  );

  return (
    <ProcessListTabContent>
      <ProcessesTable
        currentTime={currentTime}
        isLoading={loading || !response}
        processList={response}
      />
    </ProcessListTabContent>
  );
};

export const ProcessesTab = {
  id: 'processes',
  name: i18n.translate('xpack.infra.nodeDetails.tabs.processes', {
    defaultMessage: 'Processes',
  }),
  content: TabComponent,
};

const columns = [
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
    truncateText: true,
    width: '40%',
    render: (command: string) => <CodeLine>{command}</CodeLine>,
  },
  {
    field: 'runtime',
    name: i18n.translate('xpack.infra.metrics.nodeDetails.processes.columnLabelTime', {
      defaultMessage: 'Time',
    }),
    rightAlign: true,
  },
  {
    field: 'cpu',
    name: i18n.translate('xpack.infra.metrics.nodeDetails.processes.columnLabelCPU', {
      defaultMessage: 'CPU',
    }),
    render: (value: number) => FORMATTERS.percent(value),
  },
  {
    field: 'memory',
    name: i18n.translate('xpack.infra.metrics.nodeDetails.processes.columnLabelMemory', {
      defaultMessage: 'Mem.',
    }),
    render: (value: number) => FORMATTERS.percent(value),
  },
];

const ProcessesTable = ({ processList, currentTime, isLoading }) => {
  const body = !isLoading ? (
    <ProcessesTableBody processList={processList} currentTime={currentTime} />
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
              align={column.rightAlign ? 'right' : 'left'}
              width={column.width}
            >
              {column.name}
            </EuiTableHeaderCell>
          ))}
        </EuiTableHeader>
        <StyledTableBody>{body}</StyledTableBody>
      </EuiTable>
      <EuiSpacer size="m" />
      <EuiTablePagination
        itemsPerPage={10}
        activePage={0}
        pageCount={3}
        itemsPerPageOptions={[10, 20, 50]}
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

const ProcessesTableBody = ({ processList, currentTime }) => {
  const items = useMemo(
    () =>
      processList.map((process) => {
        const command = process.id;
        let mostRecentPoint;
        for (let i = process.rows.length - 1; i >= 0; i--) {
          const point = process.rows[i];
          if (point.meta?.length) {
            mostRecentPoint = point;
            break;
          }
        }

        const { cpu, memory } = mostRecentPoint;
        const { system } = mostRecentPoint.meta[0];
        const startTime = system.process.cpu.start_time;
        const state = system.process.state;

        const runtimeLength = currentTime - Date.parse(startTime);
        let remainingRuntimeMS = runtimeLength;
        const runtimeHours = Math.floor(remainingRuntimeMS / ONE_HOUR);
        remainingRuntimeMS -= runtimeHours * ONE_HOUR;
        const runtimeMinutes = Math.floor(remainingRuntimeMS / ONE_MINUTE);
        remainingRuntimeMS -= runtimeMinutes * ONE_MINUTE;
        const runtimeSeconds = Math.floor(remainingRuntimeMS / 1000);
        remainingRuntimeMS -= runtimeSeconds * 1000;

        const runtimeDisplayHours = runtimeHours ? `${runtimeHours}:` : '';
        const runtimeDisplayMinutes =
          runtimeHours && runtimeMinutes < 10 ? `0${runtimeMinutes}:` : `${runtimeMinutes}:`;
        const runtimeDisplaySeconds = runtimeSeconds < 10 ? `0${runtimeSeconds}` : runtimeSeconds;
        const runtimeDisplayMS = !runtimeDisplayHours ? `.${remainingRuntimeMS}` : '';

        const runtime = `${runtimeDisplayHours}${runtimeDisplayMinutes}${runtimeDisplaySeconds}${runtimeDisplayMS}`;

        return {
          state,
          command,
          runtime,
          cpu,
          memory,
        };
      }),
    [processList, currentTime]
  );

  return (
    <>
      {items.map((item, i) => {
        const cells = columns.map((column) => (
          <EuiTableRowCell
            key={`${column.field}-${i}`}
            header={column.name}
            align={column.rightAlign ? 'right' : 'left'}
          >
            {column.render ? column.render(item[column.field]) : item[column.field]}
          </EuiTableRowCell>
        ));
        return (
          <EuiTableRow>
            <EuiTableRowCell>
              <EuiButtonEmpty iconType="arrowRight" />
            </EuiTableRowCell>
            {cells}
          </EuiTableRow>
        );
      })}
    </>
  );
};

const StateBadge = ({ state }) => {
  switch (state) {
    case 'running':
      return (
        <EuiBadge color="secondary">
          {i18n.translate('xpack.infra.metrics.nodeDetails.processes.stateRunning', {
            defaultMessage: 'Running',
          })}
        </EuiBadge>
      );
    case 'sleeping':
      return (
        <EuiBadge color="default">
          {i18n.translate('xpack.infra.metrics.nodeDetails.processes.stateSleeping', {
            defaultMessage: 'Sleeping',
          })}
        </EuiBadge>
      );
    case 'dead':
      return (
        <EuiBadge color="danger">
          {i18n.translate('xpack.infra.metrics.nodeDetails.processes.stateDead', {
            defaultMessage: 'Dead',
          })}
        </EuiBadge>
      );
    case 'stopped':
      return (
        <EuiBadge color="warning">
          {i18n.translate('xpack.infra.metrics.nodeDetails.processes.stateStopped', {
            defaultMessage: 'Stopped',
          })}
        </EuiBadge>
      );
    case 'idle':
      return (
        <EuiBadge color="primary">
          {i18n.translate('xpack.infra.metrics.nodeDetails.processes.stateIdle', {
            defaultMessage: 'Idle',
          })}
        </EuiBadge>
      );
    case 'zombie':
      return (
        <EuiBadge color="warning">
          {i18n.translate('xpack.infra.metrics.nodeDetails.processes.stateZombie', {
            defaultMessage: 'Zombie',
          })}
        </EuiBadge>
      );
    default:
      return (
        <EuiBadge color="hollow">
          {i18n.translate('xpack.infra.metrics.nodeDetails.processes.stateUnknown', {
            defaultMessage: 'Unknown',
          })}
        </EuiBadge>
      );
  }
};

const ProcessListTabContent = euiStyled(TabContent)`
  padding-left: 0;
  padding-right: 0;
`;

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
