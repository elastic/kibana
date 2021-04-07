/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-perf/jsx-no-new-object-as-prop */

/* eslint-disable react/display-name */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { EuiInMemoryTable, EuiCodeBlock, EuiButtonIcon } from '@elastic/eui';
import { useKibana } from '../common/lib/kibana';

interface ScheduledQueryQueriesTableProps {
  data: unknown;
  editMode?: boolean;
  onDeleteClick?: () => void;
  onEditClick?: () => void;
}

const ViewResultsInDiscoverAction = ({ item }) => {
  const { createUrl } = useKibana().services.discover.urlGenerator;
  const [discoverUrl, setDiscoverUrl] = useState<string | null>();

  useEffect(() => {
    const getDiscoverUrl = async () => {
      const newUrl = await createUrl({
        indexPatternId: 'logs-*',
        timeRange: {
          to: 'now',
          from: 'now-7d',
          mode: 'relative',
        },
      });
      setDiscoverUrl(newUrl);
    };
    getDiscoverUrl();
  }, [createUrl]);

  return (
    <EuiButtonIcon
      // @ts-expect-error update types
      // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
      onClick={() => onDeleteClick(item)}
      iconType="visTable"
      href={discoverUrl}
      target="_blank"
      aria-label={`Check results of ${item.vars.id.value} in Discover`}
    />
  );
};

const ScheduledQueryQueriesTableComponent: React.FC<ScheduledQueryQueriesTableProps> = ({
  data,
  editMode = false,
  onDeleteClick,
  onEditClick,
}) => {
  const services = useKibana().services;

  console.error('data', data);

  console.error('servic', services);

  console.error('indexx', services.data.indexPatterns.find('logs-*'));

  console.error('dicsover', services.discover.urlGenerator.createUrl({}));

  // const url = await services.discover.urlGenerator.createUrl({
  //   savedSearchId: '571aaf70-4c88-11e8-b3d7-01146121b73d',
  //   indexPatternId: 'c367b774-a4c2-11ea-bb37-0242ac130002',
  //   timeRange: {
  //     to: 'now',
  //     from: 'now-15m',
  //     mode: 'relative',
  //   },
  // });
  // const handleDiscoverResultsClick = useCallback((item) => {}, []);

  const renderViewResultsAction = useCallback(
    (item) => (
      <EuiButtonIcon
        // @ts-expect-error update types
        // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
        onClick={() => onDeleteClick(item)}
        iconType="visTable"
        aria-label={`Check results of ${item.vars.id.value} in Discover`}
      />
    ),
    [onDeleteClick]
  );

  const renderDeleteAction = useCallback(
    (item) => (
      <EuiButtonIcon
        color="danger"
        // @ts-expect-error update types
        // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
        onClick={() => onDeleteClick(item)}
        iconType="trash"
        aria-label={`Delete ${item.vars.id.value}`}
      />
    ),
    [onDeleteClick]
  );

  const renderEditAction = useCallback(
    (item) => (
      <EuiButtonIcon
        color="primary"
        // @ts-expect-error update types
        // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
        onClick={() => onEditClick(item)}
        iconType="pencil"
        aria-label={`Edit ${item.vars.id.value}`}
      />
    ),
    [onEditClick]
  );

  const columns = useMemo(
    () => [
      {
        field: 'vars.id.value',
        name: 'ID',
      },
      {
        field: 'vars.interval.value',
        name: 'Interval',
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

  const sorting = {
    sort: {
      field: 'vars.id.value',
      direction: 'asc' as const,
    },
  };

  return (
    <EuiInMemoryTable
      // @ts-expect-error update types
      items={data.inputs[0].streams}
      itemId="vars.id.value"
      isExpandable={true}
      columns={columns}
      sorting={sorting}
    />
  );
};

export const ScheduledQueryQueriesTable = React.memo(ScheduledQueryQueriesTableComponent);
