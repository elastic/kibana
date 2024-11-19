/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiTableActionsColumnType,
  EuiBasicTableColumn,
  EuiToolTip,
  EuiButtonIcon,
  EuiTableSelectionType,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import moment from 'moment';

import { RoutingLink } from '../../routing';
import { FoundWorkpad } from '../../../services/canvas_workpad_service';
import { WorkpadTableTools } from './workpad_table_tools';
import { WorkpadImport } from './workpad_import';

export interface Props {
  workpads: FoundWorkpad[];
  canUserWrite: boolean;
  dateFormat: string;
  onExportWorkpad: (ids: string) => void;
  onCloneWorkpad: (id: string) => void;
}

const getDisplayName = (name: string, workpadId: string, loadedWorkpadId?: string) => {
  const workpadName = name.length ? <span>{name}</span> : <em>{workpadId}</em>;
  return workpadId === loadedWorkpadId ? <strong>{workpadName}</strong> : workpadName;
};

export const WorkpadTable = ({
  workpads,
  canUserWrite,
  dateFormat,
  onExportWorkpad: onExport,
  onCloneWorkpad,
}: Props) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const formatDate = (date: string) => date && moment(date).format(dateFormat);

  const selection: EuiTableSelectionType<FoundWorkpad> = {
    onSelectionChange: (selectedWorkpads) => {
      setSelectedIds(selectedWorkpads.map((workpad) => workpad.id).filter((id) => !!id));
    },
  };

  const actions: EuiTableActionsColumnType<any>['actions'] = [
    {
      render: (workpad: FoundWorkpad) => (
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiToolTip content={strings.getExportToolTip()}>
              <EuiButtonIcon
                iconType="exportAction"
                onClick={() => onExport(workpad.id)}
                aria-label={strings.getExportToolTip()}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                canUserWrite ? strings.getCloneToolTip() : strings.getNoPermissionToCloneToolTip()
              }
            >
              <EuiButtonIcon
                iconType="copy"
                onClick={() => onCloneWorkpad(workpad.id)}
                aria-label={strings.getCloneToolTip()}
                disabled={!canUserWrite}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  const search: EuiInMemoryTableProps<FoundWorkpad>['search'] = {
    toolsLeft:
      selectedIds.length > 0 ? <WorkpadTableTools selectedWorkpadIds={selectedIds} /> : undefined,
    toolsRight: <WorkpadImport />,
    box: {
      schema: true,
      incremental: true,
      placeholder: strings.getWorkpadSearchPlaceholder(),
      'data-test-subj': 'tableListSearchBox',
    },
  };

  const columns: Array<EuiBasicTableColumn<FoundWorkpad>> = [
    {
      field: 'name',
      name: strings.getTableNameColumnTitle(),
      sortable: true,
      dataType: 'string',
      render: (name, workpad) => (
        <RoutingLink
          data-test-subj="canvasWorkpadTableWorkpad"
          to={`/workpad/${workpad.id}`}
          aria-label={strings.getLoadWorkpadArialLabel(name.length ? name : workpad.id)}
        >
          {getDisplayName(name, workpad.id)}
        </RoutingLink>
      ),
    },
    {
      field: '@created',
      name: strings.getTableCreatedColumnTitle(),
      sortable: true,
      dataType: 'date',
      width: '20%',
      render: (date: string) => formatDate(date),
    },
    {
      field: '@timestamp',
      name: strings.getTableUpdatedColumnTitle(),
      sortable: true,
      dataType: 'date',
      width: '20%',
      render: (date: string) => formatDate(date),
    },
    { name: strings.getTableActionsColumnTitle(), actions, width: '100px' },
  ];

  return (
    <EuiInMemoryTable
      itemId="id"
      items={workpads}
      columns={columns}
      message={strings.getNoWorkpadsFoundMessage()}
      search={search}
      sorting={{
        sort: {
          field: '@timestamp',
          direction: 'desc',
        },
      }}
      pagination={true}
      selection={selection}
      data-test-subj="canvasWorkpadTable"
    />
  );
};

const strings = {
  getCloneToolTip: () =>
    i18n.translate('xpack.canvas.workpadTable.cloneTooltip', {
      defaultMessage: 'Clone workpad',
    }),
  getExportToolTip: () =>
    i18n.translate('xpack.canvas.workpadTable.exportTooltip', {
      defaultMessage: 'Export workpad',
    }),
  getLoadWorkpadArialLabel: (workpadName: string) =>
    i18n.translate('xpack.canvas.workpadTable.loadWorkpadArialLabel', {
      defaultMessage: `Load workpad ''{workpadName}''`,
      values: {
        workpadName,
      },
    }),
  getNoPermissionToCloneToolTip: () =>
    i18n.translate('xpack.canvas.workpadTable.noPermissionToCloneToolTip', {
      defaultMessage: `You don't have permission to clone workpads`,
    }),
  getNoWorkpadsFoundMessage: () =>
    i18n.translate('xpack.canvas.workpadTable.noWorkpadsFoundMessage', {
      defaultMessage: 'No workpads matched your search.',
    }),
  getWorkpadSearchPlaceholder: () =>
    i18n.translate('xpack.canvas.workpadTable.searchPlaceholder', {
      defaultMessage: 'Find workpad',
    }),
  getTableCreatedColumnTitle: () =>
    i18n.translate('xpack.canvas.workpadTable.table.createdColumnTitle', {
      defaultMessage: 'Created',
      description: 'This column in the table contains the date/time the workpad was created.',
    }),
  getTableNameColumnTitle: () =>
    i18n.translate('xpack.canvas.workpadTable.table.nameColumnTitle', {
      defaultMessage: 'Workpad name',
    }),
  getTableUpdatedColumnTitle: () =>
    i18n.translate('xpack.canvas.workpadTable.table.updatedColumnTitle', {
      defaultMessage: 'Updated',
      description: 'This column in the table contains the date/time the workpad was last updated.',
    }),
  getTableActionsColumnTitle: () =>
    i18n.translate('xpack.canvas.workpadTable.table.actionsColumnTitle', {
      defaultMessage: 'Actions',
      description: 'This column in the table contains the actions that can be taken on a workpad.',
    }),
};
