/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiInMemoryTable,
} from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';

import { DetailItem } from '../../graphql/types';

import { getColumns } from './columns';
import { getItems, search } from './helpers';

interface Props {
  data: DetailItem[];
  id: string;
}

/** Renders a table view or JSON view of the `ECS` `data` */
export const EventFieldsBrowser = pure<Props>(({ data, id }) => (
  <EuiInMemoryTable
    items={getItems(data, id)}
    columns={getColumns(id)}
    pagination={false}
    search={search}
    sorting={true}
  />
));
