/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiInMemoryTable, EuiBasicTableColumn, EuiSearchBarProps, EuiButton } from '@elastic/eui';
import type { EnrichPolicy } from '../enrich_policies_list';

export interface Props {
  policies: EnrichPolicy[];
  onReloadClick: () => void;
  onDeletePolicyClick: (policyName: string) => void;
  onExecutePolicyClick: (policyName: string) => void;
}

const pagination = {
  initialPageSize: 5,
  pageSizeOptions: [3, 5, 8],
};

export const PoliciesTable: FunctionComponent<Props> = ({
  policies,
  onReloadClick,
  onDeletePolicyClick,
  onExecutePolicyClick,
}) => {
  const renderToolsRight = () => {
    return [
      <EuiButton key="reloadPolicies" iconType="refresh" color="success" onClick={onReloadClick}>
        Reload
      </EuiButton>,
      <EuiButton key="createPolicy" fill iconType="plusInCircle">
        Create enrich policy
      </EuiButton>,
    ];
  };

  const search: EuiSearchBarProps = {
    toolsRight: renderToolsRight(),
    box: {
      incremental: true,
    },
  };

  const columns: Array<EuiBasicTableColumn<EnrichPolicy>> = [
    {
      field: 'name',
      name: 'Name',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'type',
      name: 'Type',
      sortable: true,
    },
    {
      field: 'sourceIndices',
      name: 'Source indices',
      truncateText: true,
      render: (indices: string[]) => indices.join(', '),
    },
    {
      field: 'matchField',
      name: 'Match field',
      truncateText: true,
    },
    {
      field: 'enrichFields',
      name: 'Enrich fields',
      truncateText: false,
      render: (fields: string[]) => fields.join(', '),
    },
    {
      name: 'Actions',
      actions: [
        {
          isPrimary: true,
          name: 'Execute',
          description: 'Execute this enrich policy',
          type: 'icon',
          icon: 'play',
          onClick: ({ name }) => onExecutePolicyClick(name),
        },
        {
          isPrimary: true,
          name: 'Delete',
          description: 'Delete this enrich policy',
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          onClick: ({ name }) => onDeletePolicyClick(name),
        },
      ],
    },
  ];

  return (
    <EuiInMemoryTable
      items={policies}
      itemId="name"
      columns={columns}
      search={search}
      pagination={pagination}
      sorting={true}
      isSelectable={false}
    />
  );
};
