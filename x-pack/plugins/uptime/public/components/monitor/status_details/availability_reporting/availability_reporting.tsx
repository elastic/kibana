/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiBasicTable, EuiSpacer, EuiTitle } from '@elastic/eui';
import { StatusTag } from './location_status_tags';
import { TagLabel } from './tag_label';

interface Props {
  ups: number;
  downs: number;
  allLocations: StatusTag[];
}

export const AvailabilityReporting: React.FC<Props> = ({ ups, downs, allLocations }) => {
  const [pageIndex, setPageIndex] = useState(0);

  const availability = (ups / (ups + downs)) * 100;

  const cols = [
    {
      field: 'label',
      name: 'Location',
      truncateText: true,
      render: (val: string, item: any) => {
        return <TagLabel item={item} />;
      },
    },
    {
      field: 'availability',
      name: 'Availability',
      width: '80px',
      render: (val: string) => {
        return <span>{val.toFixed(2)}%</span>;
      },
    },
    {
      name: 'Last check',
      field: 'timestamp',
      width: '100px',
    },
  ];

  const pagination = {
    pageIndex,
    pageSize: 3,
    totalItemCount: allLocations.length,
    hidePerPageOptions: true,
  };

  const onTableChange = ({ page = {} }) => {
    setPageIndex(page.index);
  };

  return (
    <>
      <EuiTitle size="s">
        <h3>{availability.toFixed(2)}% Availability</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiBasicTable
        responsive={false}
        columns={cols}
        items={allLocations.slice(pageIndex * 3, pageIndex * 3 + 3)}
        pagination={allLocations.length > 3 ? pagination : null}
        onChange={onTableChange}
      />
    </>
  );
};
