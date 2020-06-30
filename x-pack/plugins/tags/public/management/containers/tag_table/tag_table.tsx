/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import {
  EuiInMemoryTable,
  EuiSpacer,
  EuiLoadingElastic,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { RawTagWithId } from '../../../../common';
import { useServices } from '../../context';

export const TagTable: React.FC = () => {
  const { manager } = useServices();
  const initializing = manager.useInitializing();
  const tagMap = manager.useTags();
  const tags = useMemo(() => Object.values(tagMap).map(({ data }) => data), [tagMap]);

  if (initializing) {
    return (
      <>
        <EuiSpacer />
        <EuiFlexGroup gutterSize="xl" component="div" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingElastic size="xxl" />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
      </>
    );
  }

  return (
    <EuiInMemoryTable<RawTagWithId>
      itemId={'id'}
      items={tags}
      columns={[
        {
          field: 'title',
          name: 'Tag',
          sortable: true,
          render: (value: string, record: RawTagWithId) => <div>{value}</div>,
        },
        {
          field: 'description',
          name: 'Description',
          sortable: true,
        },
      ]}
      hasActions
      pagination={true}
      sorting={true}
      search={{
        box: {
          placeholder: 'Search',
        },
      }}
      loading={false}
      message={undefined}
    />
  );
};
