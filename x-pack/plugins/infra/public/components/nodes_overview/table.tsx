/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiInMemoryTable, EuiToolTip, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { last } from 'lodash';
import React, { useState, useCallback, useEffect } from 'react';
import { createWaffleMapNode } from '../../containers/waffle/nodes_to_wafflemap';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../lib/lib';
import { fieldToName } from '../waffle/lib/field_to_display_name';
import { NodeContextMenu } from '../waffle/node_context_menu';
import { InventoryItemType } from '../../../common/inventory_models/types';
import { SnapshotNode, SnapshotNodePath } from '../../../common/http_api/snapshot_api';
import { CONTAINER_CLASSNAME } from '../../apps/start_app';

interface Props {
  nodes: SnapshotNode[];
  nodeType: InventoryItemType;
  options: InfraWaffleMapOptions;
  currentTime: number;
  formatter: (subject: string | number) => string;
  onFilter: (filter: string) => void;
}

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
  const [openPopovers, setOpenPopovers] = useState<string[]>([]);
  const openPopoverFor = useCallback(
    (id: string) => () => {
      setOpenPopovers([...openPopovers, id]);
    },
    [openPopovers]
  );

  const closePopoverFor = useCallback(
    (id: string) => () => {
      if (openPopovers.includes(id)) {
        setOpenPopovers(openPopovers.filter(subject => subject !== id));
      }
    },
    [openPopovers]
  );

  useEffect(() => {
    const el = document.getElementsByClassName(CONTAINER_CLASSNAME)[0];
    if (el instanceof HTMLElement) {
      if (openPopovers.length > 0) {
        el.style.overflowY = 'hidden';
      } else {
        el.style.overflowY = 'auto';
      }
    }
  }, [openPopovers]);

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
        const uniqueID = [...item.node.path.map(p => p.value), item.node.name].join(':');
        return (
          <NodeContextMenu
            node={item.node}
            nodeType={nodeType}
            closePopover={closePopoverFor(uniqueID)}
            currentTime={currentTime}
            isPopoverOpen={openPopovers.includes(uniqueID)}
            options={options}
            popoverPosition="rightCenter"
          >
            <EuiToolTip content={tooltipText}>
              <EuiButtonEmpty onClick={openPopoverFor(uniqueID)}>{value}</EuiButtonEmpty>
            </EuiToolTip>
          </NodeContextMenu>
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
            <EuiButtonEmpty onClick={handleClick}>{value}</EuiButtonEmpty>
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

  const items = nodes.map(node => {
    const name = last(node.path);
    return {
      name: (name && name.label) || 'unknown',
      ...getGroupPaths(node.path).reduce(
        (acc, path, index) => ({
          ...acc,
          [`group_${index}`]: path.label,
        }),
        {}
      ),
      value: node.metric.value,
      avg: node.metric.avg,
      max: node.metric.max,
      node: createWaffleMapNode(node),
    };
  });
  const initialSorting = {
    sort: {
      field: 'value',
      direction: 'desc',
    },
  } as const;

  return (
    <EuiInMemoryTable pagination={true} sorting={initialSorting} items={items} columns={columns} />
  );
};
