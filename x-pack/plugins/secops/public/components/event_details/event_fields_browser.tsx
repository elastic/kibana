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

import { Ecs } from '../../graphql/types';
import { getPopulatedMappedFields, virtualEcsSchema } from '../../lib/ecs';

import { columns } from './columns';
import { getItems, search } from './helpers';

interface Props {
  data: Ecs;
}

/** Renders a table view or JSON view of the `ECS` `data` */
export const EventFieldsBrowser = pure<Props>(({ data }) => {
  const populatedFields = getPopulatedMappedFields({ data, schema: virtualEcsSchema });
  const items = getItems({ data, populatedFields });

  return (
    <EuiInMemoryTable
      items={items}
      columns={columns}
      pagination={false}
      search={search}
      sorting={true}
    />
  );
});
