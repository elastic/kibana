/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable } from '@elastic/eui';
import { Asset } from '../../common/types_api';

/*
Example user object:

{
  id: '1',
  firstName: 'john',
  lastName: 'doe',
  github: 'johndoe',
  dateOfBirth: Date.now(),
  nationality: 'NL',
  online: true
}

Example country object:

{
  code: 'NL',
  name: 'Netherlands',
  flag: '🇳🇱'
}
*/

interface AssetsTableProps {
  assets: Asset[];
}

export function AssetsTable({ assets }: AssetsTableProps) {
  const columns = [
    {
      field: '@timestamp',
      name: 'Timestamp',
      render: (date: Asset['@timestamp']) => {
        const d = new Date(date);
        return d.toLocaleString();
      },
      width: '200px',
    },
    {
      field: 'asset.ean',
      name: 'EAN (Elastic Asset Name)',
      sortable: true,
      width: '300px',
    },
    {
      field: 'asset.kind',
      name: 'Asset Kind',
      sortable: true,
    },
    {
      field: 'asset.type',
      name: 'Asset Type',
      sortable: true,
    },
    {
      field: 'asset.id',
      name: 'Asset Original ID',
      sortable: true,
    },
    {
      field: 'asset.parents',
      name: '# of parents',
      render: (parents: Asset['asset.parents']) => parents?.length || 0,
      width: '100px',
    },
    {
      field: 'asset.children',
      name: '# of children',
      render: (children: Asset['asset.children']) => children?.length || 0,
      width: '100px',
    },
  ];

  // const getRowProps = (item) => {
  //   const { id } = item;
  //   return {
  //     'data-test-subj': `row-${id}`,
  //     className: 'customRowClass',
  //     onClick: () => {},
  //   };
  // };

  // const getCellProps = (item, column) => {
  //   const { id } = item;
  //   const { field } = column;
  //   return {
  //     className: 'customCellClass',
  //     'data-test-subj': `cell-${id}-${field}`,
  //     textOnly: true,
  //   };
  // };

  return (
    <EuiBasicTable<Asset>
      tableCaption="Asset Inventory Demo"
      items={assets}
      rowHeader="firstName"
      columns={columns}
      // rowProps={getRowProps}
      // cellProps={getCellProps}
    />
  );
}
