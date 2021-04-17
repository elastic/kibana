/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { EuiInMemoryTable, EuiCodeBlock, EuiButtonIcon } from '@elastic/eui';

import { PackagePolicy, PackagePolicyInputStream } from '../../../fleet/common';
import { FilterStateStore } from '../../../../../src/plugins/data/common';
import { useKibana } from '../common/lib/kibana';

interface ViewResultsInDiscoverActionProps {
  item: PackagePolicyInputStream;
}

const ViewResultsInDiscoverAction: React.FC<ViewResultsInDiscoverActionProps> = ({ item }) => {
  const urlGenerator = useKibana().services.discover?.urlGenerator;
  const [discoverUrl, setDiscoverUrl] = useState<string>('');

  useEffect(() => {
    const getDiscoverUrl = async () => {
      if (!urlGenerator?.createUrl) return;

      const newUrl = await urlGenerator.createUrl({
        indexPatternId: 'logs-*',
        filters: [
          {
            meta: {
              index: 'logs-*',
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'action_id',
              params: { query: item.vars?.id.value },
            },
            query: { match_phrase: { action_id: item.vars?.id.value } },
            $state: { store: FilterStateStore.APP_STATE },
          },
        ],
      });
      setDiscoverUrl(newUrl);
    };
    getDiscoverUrl();
  }, [item.vars?.id.value, urlGenerator]);

  return (
    <EuiButtonIcon
      iconType="visTable"
      href={discoverUrl}
      target="_blank"
      aria-label={`Check results of ${item.vars?.id.value} in Discover`}
    />
  );
};

interface ScheduledQueryGroupQueriesTableProps {
  data: Pick<PackagePolicy, 'inputs'>;
  editMode?: boolean;
  onDeleteClick?: (item: PackagePolicyInputStream) => void;
  onEditClick?: (item: PackagePolicyInputStream) => void;
}

const ScheduledQueryGroupQueriesTableComponent: React.FC<ScheduledQueryGroupQueriesTableProps> = ({
  data,
  editMode = false,
  onDeleteClick,
  onEditClick,
}) => {
  const renderDeleteAction = useCallback(
    (item: PackagePolicyInputStream) => (
      <EuiButtonIcon
        color="danger"
        // @ts-expect-error update types
        // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
        onClick={() => onDeleteClick(item)}
        iconType="trash"
        aria-label={`Delete ${item.vars?.id.value}`}
      />
    ),
    [onDeleteClick]
  );

  const renderEditAction = useCallback(
    (item: PackagePolicyInputStream) => (
      <EuiButtonIcon
        color="primary"
        // @ts-expect-error update types
        // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
        onClick={() => onEditClick(item)}
        iconType="pencil"
        aria-label={`Edit ${item.vars?.id.value}`}
      />
    ),
    [onEditClick]
  );

  const columns = useMemo(
    () => [
      {
        field: 'vars.id.value',
        name: 'ID',
        width: '20%',
      },
      {
        field: 'vars.interval.value',
        name: 'Interval',
        width: '100px',
      },
      {
        field: 'vars.query.value',
        name: 'Query',
        render: (query: string) => (
          <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
            {query}
          </EuiCodeBlock>
        ),
      },
      {
        name: 'Actions',
        width: '80px',
        actions: editMode
          ? [
              {
                render: renderEditAction,
              },
              {
                render: renderDeleteAction,
              },
            ]
          : [
              {
                render: (item) => <ViewResultsInDiscoverAction item={item} />,
              },
            ],
      },
    ],
    [editMode, renderDeleteAction, renderEditAction]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: 'vars.id.value',
        direction: 'asc' as const,
      },
    }),
    []
  );

  return (
    <EuiInMemoryTable<PackagePolicyInputStream>
      items={data.inputs[0].streams}
      itemId="vars.id.value"
      isExpandable={true}
      columns={columns}
      sorting={sorting}
    />
  );
};

export const ScheduledQueryGroupQueriesTable = React.memo(ScheduledQueryGroupQueriesTableComponent);
