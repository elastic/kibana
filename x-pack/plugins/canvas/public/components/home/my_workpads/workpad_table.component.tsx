/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
import { ComponentStrings } from '../../../../i18n';
import { FoundWorkpad } from '../../../services/workpad';
import { WorkpadTableTools } from './workpad_table_tools';
import { WorkpadImport } from './workpad_import';

export interface Props {
  workpads: FoundWorkpad[];
  canUserWrite: boolean;
  dateFormat: string;
  onExportWorkpad: (ids: string) => void;
  onCloneWorkpad: (id: string) => void;
}

const { WorkpadTable: strings } = ComponentStrings;

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
          data-test-subj="canvasWorkpadLoaderWorkpad"
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
      data-test-subj="workpadTable"
    />
  );
};
