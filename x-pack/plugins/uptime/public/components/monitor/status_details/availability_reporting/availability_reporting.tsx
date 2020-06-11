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
import { AvailabilityLabel, LastCheckLabel, LocationLabel } from '../translations';

interface Props {
  allLocations: StatusTag[];
}

export const AvailabilityReporting: React.FC<Props> = ({ allLocations }) => {
  const [pageIndex, setPageIndex] = useState(0);

  const cols = [
    {
      field: 'label',
      name: LocationLabel,
      truncateText: true,
      render: (val: string, item: StatusTag) => {
        return <TagLabel color={item.color} label={item.label} />;
      },
    },
    {
      field: 'availability',
      name: AvailabilityLabel,
      align: 'right' as const,
      render: (val: number) => {
        return <span>{val.toFixed(2)} %</span>;
      },
    },
    {
      name: LastCheckLabel,
      field: 'timestamp',
      align: 'right' as const,
    },
  ];
  const pageSize = 5;

  const pagination: Pagination = {
    pageIndex,
    pageSize,
    totalItemCount: allLocations.length,
    hidePerPageOptions: true,
  };

  const onTableChange = ({ page }: any) => {
    setPageIndex(page.index);
  };

  const paginationProps = allLocations.length > pageSize ? { pagination } : {};

  return (
    <>
      <EuiSpacer size="s" />
      <EuiBasicTable
        responsive={false}
        compressed={true}
        columns={cols}
        items={allLocations.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)}
        onChange={onTableChange}
        {...paginationProps}
      />
    </>
  );
};
