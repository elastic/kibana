/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { EuiInMemoryTable, EuiCodeBlock, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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
      aria-label={i18n.translate(
        'xpack.osquery.scheduledQueryGroup.queriesTable.viewDiscoverResultsActionAriaLabel',
        {
          defaultMessage: 'Check results of {queryName} in Discover',
          values: {
            queryName: item.vars?.id.value,
          },
        }
      )}
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
        aria-label={i18n.translate(
          'xpack.osquery.scheduledQueryGroup.queriesTable.deleteActionAriaLabel',
          {
            defaultMessage: 'Delete {queryName}',
            values: {
              queryName: item.vars?.id.value,
            },
          }
        )}
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
        aria-label={i18n.translate(
          'xpack.osquery.scheduledQueryGroup.queriesTable.editActionAriaLabel',
          {
            defaultMessage: 'Edit {queryName}',
            values: {
              queryName: item.vars?.id.value,
            },
          }
        )}
      />
    ),
    [onEditClick]
  );

  const renderQueryColumn = useCallback(
    (query: string) => (
      <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
        {query}
      </EuiCodeBlock>
    ),
    []
  );

  const renderDiscoverResultsAction = useCallback(
    (item) => <ViewResultsInDiscoverAction item={item} />,
    []
  );

  const columns = useMemo(
    () => [
      {
        field: 'vars.id.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.idColumnTitle', {
          defaultMessage: 'ID',
        }),
        width: '20%',
      },
      {
        field: 'vars.interval.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.intervalColumnTitle', {
          defaultMessage: 'Interval (s)',
        }),
        width: '100px',
      },
      {
        field: 'vars.query.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.queryColumnTitle', {
          defaultMessage: 'Query',
        }),
        render: renderQueryColumn,
      },
      {
        name: editMode
          ? i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.actionsColumnTitle', {
              defaultMessage: 'Actions',
            })
          : i18n.translate(
              'xpack.osquery.scheduledQueryGroup.queriesTable.viewResultsColumnTitle',
              {
                defaultMessage: 'View results',
              }
            ),
        width: '120px',
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
                render: renderDiscoverResultsAction,
              },
            ],
      },
    ],
    [editMode, renderDeleteAction, renderDiscoverResultsAction, renderEditAction, renderQueryColumn]
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
