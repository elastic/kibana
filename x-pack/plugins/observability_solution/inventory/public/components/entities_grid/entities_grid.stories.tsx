/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridSorting, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { Meta, Story } from '@storybook/react';
import { orderBy } from 'lodash';
import React, { useMemo, useState } from 'react';
import { ENTITY_LAST_SEEN, ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import { EntitiesGrid } from '.';
import { EntityType } from '../../../common/entities';
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
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | undefined>();
  const filteredAndSortedItems = useMemo(
    () =>
      orderBy(
        selectedEntityType
          ? entitiesMock.filter((mock) => mock[ENTITY_TYPE] === selectedEntityType)
          : entitiesMock,
        sort.id,
        sort.direction
      ),
    [selectedEntityType, sort.direction, sort.id]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        {`Entity filter: ${selectedEntityType || 'N/A'}`}
        <EuiLink
          disabled={!selectedEntityType}
          data-test-subj="inventoryExampleClearFilterButton"
          onClick={() => setSelectedEntityType(undefined)}
        >
          Clear filter
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EntitiesGrid
          entities={filteredAndSortedItems}
          loading={false}
          sortDirection={sort.direction}
          sortField={sort.id}
          onChangePage={setPageIndex}
          onChangeSort={setSort}
          pageIndex={pageIndex}
          onFilterByType={setSelectedEntityType}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const EmptyGridExample: Story<{}> = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const [sort, setSort] = useState<EuiDataGridSorting['columns'][0]>({
    id: ENTITY_LAST_SEEN,
    direction: 'desc',
  });

  return (
    <EntitiesGrid
      entities={[]}
      loading={false}
      sortDirection={sort.direction}
      sortField={sort.id}
      onChangePage={setPageIndex}
      onChangeSort={setSort}
      pageIndex={pageIndex}
      onFilterByType={() => {}}
    />
  );
};
