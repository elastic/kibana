/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiInMemoryTable, EuiToolTip, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { last, first } from 'lodash';
import React, { useState, useMemo } from 'react';
import { EuiPopover } from '@elastic/eui';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { createWaffleMapNode } from '../lib/nodes_to_wafflemap';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../../../lib/lib';
import { fieldToName } from '../lib/field_to_display_name';
import { NodeContextMenu } from './waffle/node_context_menu';
import { SnapshotNode, SnapshotNodePath } from '../../../../../common/http_api/snapshot_api';

interface Props {
  nodes: SnapshotNode[];
  nodeType: InventoryItemType;
  options: InfraWaffleMapOptions;
  currentTime: number;
  formatter: (subject: string | number) => string;
  onFilter: (filter: string) => void;
}

const initialSorting = {
  sort: {
    field: 'value',
    direction: 'desc',
  },
} as const;

const getGroupPaths = (path: SnapshotNodePath[]) => {
  switch (path.length) {
    case 3:
      return path.slice(0, 2);
    case 2:
      return path.slice(0, 1);
    default:
      return [];
  }
};

export const TableView = (props: Props) => {
  const { nodes, options, formatter, currentTime, nodeType } = props;

  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  const closePopover = () => setOpenPopoverId(null);

  const columns: Array<EuiBasicTableColumn<typeof items[number]>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.infra.tableView.columnName.name', { defaultMessage: 'Name' }),
      sortable: true,
      truncateText: true,
      textOnly: true,
      render: (value: string, item: { node: InfraWaffleMapNode }) => {
        const tooltipText = item.node.id === value ? `${value}` : `${value} (${item.node.id})`;
        // For the table we need to create a UniqueID that takes into to account the groupings
        // as well as the node name. There is the possibility that a node can be present in two
        // different groups and be on the screen at the same time.
        const uniqueID = [...item.node.path.map((p) => p.value), item.node.name].join(':');
        const button = (
          <EuiToolTip content={tooltipText}>
            <EuiButtonEmpty
              data-test-subj="infraColumnsButton"
              onClick={() => setOpenPopoverId(uniqueID)}
            >
              {value}
            </EuiButtonEmpty>
          </EuiToolTip>
        );

        return (
          <EuiPopover
            button={button}
            isOpen={openPopoverId === uniqueID}
            closePopover={closePopover}
            anchorPosition="rightCenter"
          >
            <NodeContextMenu
              node={item.node}
              nodeType={nodeType}
              currentTime={currentTime}
              options={options}
            />
          </EuiPopover>
        );
      },
    },
    ...options.groupBy.map((grouping, index) => ({
      field: `group_${index}`,
      name: fieldToName((grouping && grouping.field) || ''),
      sortable: true,
      truncateText: true,
      textOnly: true,
      render: (value: string) => {
        const handleClick = () => props.onFilter(`${grouping.field}:"${value}"`);
        return (
          <EuiToolTip content="Set Filter">
            <EuiButtonEmpty data-test-subj="infraColumnsButton" onClick={handleClick}>
              {value}
            </EuiButtonEmpty>
          </EuiToolTip>
        );
      },
    })),
    {
      field: 'value',
      name: i18n.translate('xpack.infra.tableView.columnName.last1m', {
        defaultMessage: 'Last 1m',
      }),
      sortable: true,
      truncateText: true,
      dataType: 'number',
      render: (value: number) => <span>{formatter(value)}</span>,
    },
    {
      field: 'avg',
      name: i18n.translate('xpack.infra.tableView.columnName.avg', { defaultMessage: 'Avg' }),
      sortable: true,
      truncateText: true,
      dataType: 'number',
      render: (value: number) => <span>{formatter(value)}</span>,
    },
    {
      field: 'max',
      name: i18n.translate('xpack.infra.tableView.columnName.max', { defaultMessage: 'Max' }),
      sortable: true,
      truncateText: true,
      dataType: 'number',
      render: (value: number) => <span>{formatter(value)}</span>,
    },
  ];

  const items = useMemo(
    () =>
      nodes.map((node) => {
        const name = last(node.path);
        const metric = first(node.metrics);
        return {
          name: (name && name.label) || 'unknown',
          ...getGroupPaths(node.path).reduce(
            (acc, path, index) => ({
              ...acc,
              [`group_${index}`]: path.label,
            }),
            {}
          ),
          value: (metric && metric.value) || 0,
          avg: (metric && metric.avg) || 0,
          max: (metric && metric.max) || 0,
          node: createWaffleMapNode(node),
        };
      }),
    [nodes]
  );

  return (
    <EuiInMemoryTable pagination={true} sorting={initialSorting} items={items} columns={columns} />
  );
};
