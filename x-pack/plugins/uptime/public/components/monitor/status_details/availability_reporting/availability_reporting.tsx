/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiBasicTable, EuiSpacer } from '@elastic/eui';
import { Pagination } from '@elastic/eui/src/components/basic_table/pagination_bar';
import { StatusTag } from './location_status_tags';
import { TagLabel } from './tag_label';

interface Props {
  allLocations: StatusTag[];
}

export const AvailabilityReporting: React.FC<Props> = ({ allLocations }) => {
  const [pageIndex, setPageIndex] = useState(0);

  const cols = [
    {
      field: 'label',
      name: 'Location',
      truncateText: true,
      render: (val: string, item: StatusTag) => {
        return <TagLabel color={item.color} label={item.label} />;
      },
    },
    {
      field: 'availability',
      name: 'Availability',
      align: 'right' as const,
      render: (val: number) => {
        return <span>{val.toFixed(2)}%</span>;
      },
    },
    {
      name: 'Last check',
      field: 'timestamp',
      align: 'right' as const,
    },
  ];

  const pagination: Pagination | undefined =
    allLocations.length > 4
      ? {
          pageIndex,
          pageSize: 4,
          totalItemCount: allLocations.length,
          hidePerPageOptions: true,
        }
      : undefined;

  const onTableChange = ({ page }: any) => {
    setPageIndex(page.index);
  };

  return (
    <>
      <EuiSpacer size="s" />
      {/*
        // @ts-ignore */}
      <EuiBasicTable
        responsive={false}
        compressed={true}
        columns={cols}
        items={allLocations.slice(pageIndex * 4, pageIndex * 4 + 4)}
        pagination={pagination}
        onChange={onTableChange}
      />
    </>
  );
};
