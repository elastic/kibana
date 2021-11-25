/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableComputedColumnType, Pagination } from '@elastic/eui';
import {
  EuiCallOut,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { lazy, Suspense, useMemo, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { getSpaceAvatarComponent } from '../../space_avatar';
import type { SpacesDataEntry } from '../../types';
import type { InternalLegacyUrlAliasTarget } from './types';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

interface Props {
  spaces: SpacesDataEntry[];
  aliasesToDisable: InternalLegacyUrlAliasTarget[];
}

export const AliasTable: FunctionComponent<Props> = ({ spaces, aliasesToDisable }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  const spacesMap = useMemo(
    () =>
      spaces.reduce((acc, space) => acc.set(space.id, space), new Map<string, SpacesDataEntry>()),
    [spaces]
  );
  const filteredAliasesToDisable = useMemo(
    () => aliasesToDisable.filter(({ spaceExists }) => spaceExists),
    [aliasesToDisable]
  );
  const aliasesToDisableCount = filteredAliasesToDisable.length;
  const pagination: Pagination = {
    pageIndex,
    pageSize,
    totalItemCount: aliasesToDisableCount,
    pageSizeOptions: [5, 10, 15, 20],
  };

  return (
    <>
      <EuiCallOut
        size="s"
        title={
          <FormattedMessage
            id="xpack.spaces.shareToSpace.aliasTableCalloutTitle"
            defaultMessage="Legacy URL conflict"
          />
        }
        color="warning"
      >
        <FormattedMessage
          id="xpack.spaces.shareToSpace.aliasTableCalloutBody"
          defaultMessage="{aliasesToDisableCount, plural, one {# legacy URL} other {# legacy URLs}} will be disabled."
          values={{ aliasesToDisableCount }}
        />
      </EuiCallOut>

      <EuiSpacer size="m" />

      <EuiFlexItem>
        <Suspense fallback={<EuiLoadingSpinner />}>
          <EuiInMemoryTable
            items={filteredAliasesToDisable}
            columns={[
              { name: 'Type', field: 'targetType', sortable: true },
              { name: 'ID', field: 'sourceId', sortable: true, truncateText: true },
              {
                name: 'Space',
                render: ({ targetSpace }) => {
                  const space = spacesMap.get(targetSpace)!; // it's safe to use ! here because we filtered only for aliases that are in spaces that exist
                  return <LazySpaceAvatar space={space} size={'s'} />; // the whole table is wrapped in a Suspense
                },
                sortable: ({ targetSpace }) => targetSpace,
              } as EuiTableComputedColumnType<InternalLegacyUrlAliasTarget>,
            ]}
            sorting={true}
            pagination={pagination}
            onTableChange={({ page: { index, size } }) => {
              setPageIndex(index);
              setPageSize(size);
            }}
            tableLayout="auto"
          />
        </Suspense>
      </EuiFlexItem>
    </>
  );
};
