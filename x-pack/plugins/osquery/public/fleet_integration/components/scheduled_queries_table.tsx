/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-perf/jsx-no-new-object-as-prop */

/* eslint-disable react/display-name */

import React, { useCallback, useMemo } from 'react';
import { EuiInMemoryTable, EuiCodeBlock, EuiButtonIcon } from '@elastic/eui';

interface ScheduledQueryQueriesTableProps {
  data: unknown;
  onDeleteClick?: () => void;
  onEditClick?: () => void;
}

export const ScheduledQueryQueriesTable: React.FC<ScheduledQueryQueriesTableProps> = ({
  data,
  onDeleteClick,
  onEditClick,
}) => {
  const renderDeleteAction = useCallback(
    (item) => (
      <EuiButtonIcon
        color="danger"
        // eslint-disable-next-line react/jsx-no-bind
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
        // eslint-disable-next-line react/jsx-no-bind
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
        actions: [
          {
            render: renderEditAction,
          },
          {
            render: renderDeleteAction,
          },
        ],
      },
    ],
    [renderDeleteAction, renderEditAction]
  );

  const sorting = {
    sort: {
      field: 'vars.id.value',
      direction: 'asc' as const,
    },
  };

  return (
    <EuiInMemoryTable
      items={data.inputs[0].streams}
      itemId="vars.id.value"
      isExpandable={true}
      columns={columns}
      sorting={sorting}
    />
  );
};
