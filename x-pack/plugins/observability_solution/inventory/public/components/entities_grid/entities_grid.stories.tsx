/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridSorting } from '@elastic/eui';
import { Meta, Story } from '@storybook/react';
import React, { useMemo, useState } from 'react';
import { orderBy } from 'lodash';
import { EntitiesGrid } from '.';
import { ENTITY_LAST_SEEN } from '../../../common/es_fields/entities';
import { entitiesMock } from './mock/entities_mock';

const stories: Meta<{}> = {
  title: 'app/inventory/entities_grid',
  component: EntitiesGrid,
};
export default stories;

export const Example: Story<{}> = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const [sort, setSort] = useState<EuiDataGridSorting['columns'][0]>({
    id: ENTITY_LAST_SEEN,
    direction: 'desc',
  });

  const sortedItems = useMemo(
    () => orderBy(entitiesMock, sort.id, sort.direction),
    [sort.direction, sort.id]
  );

  return (
    <EntitiesGrid
      entities={sortedItems}
      loading={false}
      sortDirection={sort.direction}
      sortField={sort.id}
      onChangePage={setPageIndex}
      onChangeSort={setSort}
      pageIndex={pageIndex}
    />
  );
};
