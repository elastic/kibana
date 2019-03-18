/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { MlListGroup, MlListGroupItem } from '../../pages/data_frame_new_pivot/type_definitions';

import {
  EuiListGroup,
  // This isn't part of EUI's type definitions yet.
  // @ts-ignore
  EuiListGroupItem,
} from '@elastic/eui';

interface ListProps {
  list: string[];
  deleteHandler(l: string): void;
}

const ListGroup: MlListGroup = EuiListGroup;
const ListGroupItem: MlListGroupItem = EuiListGroupItem;

export const GroupByList: React.SFC<ListProps> = ({ deleteHandler, list }) => (
  <ListGroup flush={true}>
    {list.map((l: string) => (
      <ListGroupItem
        key={l}
        label={l}
        extraAction={{
          onClick: () => deleteHandler(l),
          iconType: 'cross',
          iconSize: 's',
          'aria-label': l,
          alwaysShow: false,
        }}
      />
    ))}
  </ListGroup>
);
