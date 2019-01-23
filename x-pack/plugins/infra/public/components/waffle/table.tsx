/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiInMemoryTable } from '@elastic/eui';
import { last } from 'lodash';
import React from 'react';
import { InfraNodeType } from '../../../server/lib/adapters/nodes';
import { InfraNode, InfraNodePath, InfraTimerangeInput } from '../../graphql/types';
import { InfraWaffleMapOptions } from '../../lib/lib';
import { NodeContextMenu } from './node_context_menu';

interface Props {
  nodes: InfraNode[];
  nodeType: InfraNodeType;
  options: InfraWaffleMapOptions;
  formatter: (subject: string | number) => string;
  timeRange: InfraTimerangeInput;
}

const getGroupPaths = (path: InfraNodePath[]) => {
  switch (path.length) {
    case 3:
      return path.slice(0, 2);
    case 2:
      return path.slice(0, 1);
    default:
      return [];
  }
};

export const TableView: React.SFC<Props> = ({ nodes, options, formatter }) => {
  const columns = [
    {
      field: 'name',
      name: 'Name',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'groups',
      name: 'Groups',
      sortable: true,
      truncateText: true,
      render: (paths: InfraNodePath[]) => {
        return paths.map(path => path.label).join(', ');
      },
    },
    {
      field: 'value',
      name: 'Last 1m',
      sortable: true,
      truncateText: true,
      dataType: 'number',
      render: (value: number) => <span>{formatter(value)}</span>,
    },
    {
      field: 'avg',
      name: 'Avg',
      sortable: true,
      truncateText: true,
      dataType: 'number',
      render: (value: number) => <span>{formatter(value)}</span>,
    },
    {
      field: 'max',
      name: 'Max',
      sortable: true,
      truncateText: true,
      dataType: 'number',
      render: (value: number) => <span>{formatter(value)}</span>,
    },
  ];
  const items = nodes.map(node => {
    const name = last(node.path);
    return {
      name: (name && name.value) || 'unknown',
      groups: getGroupPaths(node.path),
      value: node.metric.value,
      avg: node.metric.avg,
      max: node.metric.max,
    };
  });
  return <EuiInMemoryTable items={items} columns={columns} />;
};
