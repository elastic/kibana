/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiListGroup, EuiListGroupItem } from '@elastic/eui';

interface ListProps {
  list: string[];
  deleteHandler?(l: string): void;
}

export const GroupByList: React.SFC<ListProps> = ({ deleteHandler, list }) => (
  <EuiListGroup flush={true}>
    {list.map((l: string) => (
      <EuiListGroupItem
        key={l}
        label={l}
        extraAction={
          (deleteHandler && {
            onClick: () => deleteHandler(l),
            iconType: 'cross',
            iconSize: 's',
            'aria-label': l,
            alwaysShow: false,
          }) ||
          undefined
        }
      />
    ))}
  </EuiListGroup>
);
