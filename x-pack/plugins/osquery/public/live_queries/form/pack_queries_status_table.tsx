/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiButtonIcon,
  EuiToolTip,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  RIGHT_ALIGNMENT,
  EuiBadge,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';

import type {
  TypedLensByValueInput,
  PersistedIndexPatternLayer,
  PieVisualizationState,
  TermsIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import { DOCUMENT_FIELD_NAME as RECORDS_FIELD } from '@kbn/lens-plugin/common/constants';
import { FilterStateStore } from '@kbn/es-query';
import type { DataView } from '@kbn/data-plugin/common';
import styled from 'styled-components';
import { removeMultilines } from '../../../common/utils/build_query/remove_multilines';
import { useKibana } from '../../common/lib/kibana';
import type { OsqueryManagerPackagePolicyInputStream } from '../../../common/types';
import { usePackQueryLastResults } from '../../packs/use_pack_query_last_results';
import { ResultTabs } from '../../routes/saved_queries/edit/tabs';

const StyledEuiBasicTable = styled(EuiBasicTable)`
  .euiTableRow.euiTableRow-isExpandedRow > td > div {
    padding: 0;
  }
`;

const VIEW_IN_DISCOVER = i18n.translate(
  'xpack.osquery.pack.queriesTable.viewDiscoverResultsActionAriaLabel',
  {
    defaultMessage: 'View in Discover',
  }
);

const VIEW_IN_LENS = i18n.translate(
  'xpack.osquery.pack.queriesTable.viewLensResultsActionAriaLabel',
  {
    defaultMessage: 'View in Lens',
  }
);

export enum ViewResultsActionButtonType {
  icon = 'icon',
  button = 'button',
}

interface ViewResultsInDiscoverActionProps {
  actionId?: string;
  agentIds?: string[];
  buttonType: ViewResultsActionButtonType;
  endDate?: string;
  startDate?: string;
  mode?: string;
}

function getLensAttributes(
  actionId?: string,
  agentIds?: string[]
): TypedLensByValueInput['attributes'] {
  const dataLayer: PersistedIndexPatternLayer = {
    columnOrder: ['8690befd-fd69-4246-af4a-dd485d2a3b38', 'ed999e9d-204c-465b-897f-fe1a125b39ed'],
    columns: {
      '8690befd-fd69-4246-af4a-dd485d2a3b38': {
        sourceField: 'type',
        isBucketed: true,
        dataType: 'string',
        scale: 'ordinal',
        operationType: 'terms',
        label: 'Top values of type',
        params: {
          otherBucket: true,
          size: 5,
          missingBucket: false,
          orderBy: {
            columnId: 'ed999e9d-204c-465b-897f-fe1a125b39ed',
            type: 'column',
          },
          orderDirection: 'desc',
        },
      } as TermsIndexPatternColumn,
      'ed999e9d-204c-465b-897f-fe1a125b39ed': {
        sourceField: RECORDS_FIELD,
        isBucketed: false,
        dataType: 'number',
        scale: 'ratio',
        operationType: 'count',
        label: 'Count of records',
      },
    },
    incompleteColumns: {},
  };

  const xyConfig: PieVisualizationState = {
    shape: 'pie',
    layers: [
      {
        layerType: 'data',
        legendDisplay: 'default',
        nestedLegend: false,
        layerId: 'layer1',
        metric: 'ed999e9d-204c-465b-897f-fe1a125b39ed',
        numberDisplay: 'percent',
        groups: ['8690befd-fd69-4246-af4a-dd485d2a3b38'],
        categoryDisplay: 'default',
      },
    ],
  };

  const agentIdsQuery = agentIds?.length
    ? {
        bool: {
          minimum_should_match: 1,
          should: agentIds?.map((agentId) => ({ match_phrase: { 'agent.id': agentId } })),
        },
      }
    : undefined;

  return {
    visualizationType: 'lnsPie',
    title: `Action ${actionId} results`,
    references: [
      {
        id: 'logs-*',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'logs-*',
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
      {
        name: 'filter-index-pattern-0',
        id: 'logs-*',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            layer1: dataLayer,
          },
        },
      },
      filters: [
        {
          $state: { store: FilterStateStore.APP_STATE },
          meta: {
            index: 'filter-index-pattern-0',
            negate: false,
            alias: null,
            disabled: false,
            params: {
              query: actionId,
            },
            type: 'phrase',
            key: 'action_id',
          },
          query: {
            match_phrase: {
              action_id: actionId,
            },
          },
        },
        ...(agentIdsQuery
          ? [
              {
                $state: { store: FilterStateStore.APP_STATE },
                meta: {
                  alias: 'agent IDs',
                  disabled: false,
                  index: 'filter-index-pattern-0',
                  key: 'query',
                  negate: false,
                  type: 'custom',
                  value: JSON.stringify(agentIdsQuery),
                },
                query: agentIdsQuery,
              },
            ]
          : []),
      ],
      query: { language: 'kuery', query: '' },
      visualization: xyConfig,
    },
  };
}

const ViewResultsInLensActionComponent: React.FC<ViewResultsInDiscoverActionProps> = ({
  actionId,
  agentIds,
  buttonType,
  endDate,
  startDate,
  mode,
}) => {
  const lensService = useKibana().services.lens;
  const isLensAvailable = lensService?.canUseEditor();

  const handleClick = useCallback(
    (event) => {
      event.preventDefault();

      lensService?.navigateToPrefilledEditor(
        {
          id: '',
          timeRange: {
            from: startDate ?? 'now-1d',
            to: endDate ?? 'now',
            mode: mode ?? (startDate || endDate) ? 'absolute' : 'relative',
          },
          attributes: getLensAttributes(actionId, agentIds),
        },
        {
          openInNewTab: true,
          skipAppLeave: true,
        }
      );
    },
    [actionId, agentIds, endDate, lensService, mode, startDate]
  );

  if (!isLensAvailable) {
    return null;
  }

  if (buttonType === ViewResultsActionButtonType.button) {
    return (
      <EuiButtonEmpty size="xs" iconType="lensApp" onClick={handleClick} disabled={false}>
        {VIEW_IN_LENS}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiToolTip content={VIEW_IN_LENS}>
      <EuiButtonIcon
        iconType="lensApp"
        disabled={false}
        onClick={handleClick}
        aria-label={VIEW_IN_LENS}
      />
    </EuiToolTip>
  );
};

export const ViewResultsInLensAction = React.memo(ViewResultsInLensActionComponent);

const ViewResultsInDiscoverActionComponent: React.FC<ViewResultsInDiscoverActionProps> = ({
  actionId,
  agentIds,
  buttonType,
  endDate,
  startDate,
}) => {
  const { discover, application } = useKibana().services;
  const locator = discover?.locator;
  const discoverPermissions = application.capabilities.discover;

  const [discoverUrl, setDiscoverUrl] = useState<string>('');

  useEffect(() => {
    const getDiscoverUrl = async () => {
      if (!locator) return;

      const agentIdsQuery = agentIds?.length
        ? {
            bool: {
              minimum_should_match: 1,
              should: agentIds.map((agentId) => ({ match_phrase: { 'agent.id': agentId } })),
            },
          }
        : null;

      const newUrl = await locator.getUrl({
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
              params: { query: actionId },
            },
            query: { match_phrase: { action_id: actionId } },
            $state: { store: FilterStateStore.APP_STATE },
          },
          ...(agentIdsQuery
            ? [
                {
                  $state: { store: FilterStateStore.APP_STATE },
                  meta: {
                    alias: 'agent IDs',
                    disabled: false,
                    index: 'logs-*',
                    key: 'query',
                    negate: false,
                    type: 'custom',
                    value: JSON.stringify(agentIdsQuery),
                  },
                  query: agentIdsQuery,
                },
              ]
            : []),
        ],
        refreshInterval: {
          pause: true,
          value: 0,
        },
        timeRange:
          startDate && endDate
            ? {
                to: endDate,
                from: startDate,
                mode: 'absolute',
              }
            : {
                to: 'now',
                from: 'now-1d',
                mode: 'relative',
              },
      });
      setDiscoverUrl(newUrl);
    };

    getDiscoverUrl();
  }, [actionId, agentIds, endDate, startDate, locator]);

  if (!discoverPermissions.show) {
    return null;
  }

  if (buttonType === ViewResultsActionButtonType.button) {
    return (
      <EuiButtonEmpty size="xs" iconType="discoverApp" href={discoverUrl} target="_blank">
        {VIEW_IN_DISCOVER}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiToolTip content={VIEW_IN_DISCOVER}>
      <EuiButtonIcon
        iconType="discoverApp"
        aria-label={VIEW_IN_DISCOVER}
        href={discoverUrl}
        target="_blank"
      />
    </EuiToolTip>
  );
};

export const ViewResultsInDiscoverAction = React.memo(ViewResultsInDiscoverActionComponent);

interface DocsColumnResultsProps {
  count?: number;
  isLive?: boolean;
}

const DocsColumnResults: React.FC<DocsColumnResultsProps> = ({ count, isLive }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    <EuiFlexItem grow={false}>
      {count ? <EuiNotificationBadge color="subdued">{count}</EuiNotificationBadge> : '-'}
    </EuiFlexItem>
    {isLive ? (
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner />
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
);

interface AgentsColumnResultsProps {
  successful?: number;
  pending?: number;
  failed?: number;
}

const AgentsColumnResults: React.FC<AgentsColumnResultsProps> = ({
  successful,
  pending,
  failed,
}) => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiText color="subdued">
        <EuiBadge color="success">{successful}</EuiBadge>
        {' / '}
        <EuiBadge color="default">{pending}</EuiBadge>
        {' / '}
        <EuiBadge color={failed ? 'danger' : 'default'}>{failed}</EuiBadge>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

interface PackViewInActionProps {
  item: {
    id: string;
    interval: number;
    action_id?: string;
  };
  actionId?: string;
  logsDataView: DataView | undefined;
  agentIds?: string[];
}

const PackViewInDiscoverActionComponent: React.FC<PackViewInActionProps> = ({
  item,
  logsDataView,
  agentIds,
}) => {
  const { action_id: actionId, interval } = item;
  const { data: lastResultsData } = usePackQueryLastResults({
    actionId,
    interval,
    logsDataView,
  });

  const startDate = lastResultsData?.['@timestamp']
    ? moment(lastResultsData?.['@timestamp'][0]).subtract(interval, 'seconds').toISOString()
    : `now-${interval}s`;
  const endDate = lastResultsData?.['@timestamp']
    ? moment(lastResultsData?.['@timestamp'][0]).toISOString()
    : 'now';

  return (
    <ViewResultsInDiscoverAction
      actionId={actionId}
      agentIds={agentIds}
      buttonType={ViewResultsActionButtonType.icon}
      startDate={startDate}
      endDate={endDate}
      mode={lastResultsData?.['@timestamp'][0] ? 'absolute' : 'relative'}
    />
  );
};

const PackViewInDiscoverAction = React.memo(PackViewInDiscoverActionComponent);

const PackViewInLensActionComponent: React.FC<PackViewInActionProps> = ({
  item,
  logsDataView,
  agentIds,
  actionId,
}) => {
  const { interval } = item;
  const { data: lastResultsData } = usePackQueryLastResults({
    actionId,
    interval,
    logsDataView,
  });

  const startDate = lastResultsData?.['@timestamp']
    ? moment(lastResultsData?.['@timestamp'][0]).subtract(interval, 'seconds').toISOString()
    : `now-${interval}s`;
  const endDate = lastResultsData?.['@timestamp']
    ? moment(lastResultsData?.['@timestamp'][0]).toISOString()
    : 'now';

  return (
    <ViewResultsInLensAction
      actionId={actionId}
      agentIds={agentIds}
      buttonType={ViewResultsActionButtonType.icon}
      startDate={startDate}
      endDate={endDate}
      mode={lastResultsData?.['@timestamp'][0] ? 'absolute' : 'relative'}
    />
  );
};

const PackViewInLensAction = React.memo(PackViewInLensActionComponent);

interface PackQueriesStatusTableProps {
  agentIds?: string[];
  actionId?: string;
  data?: Array<
    Partial<{
      action_id: string;
      id: string;
      query: string;
      agents: string[];
      ecs_mapping?: unknown;
      version?: string;
      platform?: string;
      saved_query_id?: string;
    }>
  >;
  startDate?: string;
  expirationDate?: string;
}

const PackQueriesStatusTableComponent: React.FC<PackQueriesStatusTableProps> = ({
  agentIds,
  data,
  startDate,
  expirationDate,
}) => {
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, unknown>>({});

  const {
    data: { dataViews },
  } = useKibana().services;
  const [logsDataView, setLogsDataView] = useState<DataView | undefined>(undefined);

  useEffect(() => {
    const fetchLogsDataView = async () => {
      const dataView = await dataViews.find('logs-*');

      setLogsDataView(dataView[0]);
    };

    fetchLogsDataView();
  }, [dataViews]);

  const renderQueryColumn = useCallback((query: string, item) => {
    const singleLine = removeMultilines(query);
    const content = singleLine.length > 55 ? `${singleLine.substring(0, 55)}...` : singleLine;

    return (
      <EuiToolTip title={item.id} content={<EuiFlexItem>{query}</EuiFlexItem>}>
        <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
          {content}
        </EuiCodeBlock>
      </EuiToolTip>
    );
  }, []);

  const renderDocsColumn = useCallback(
    (item) => (
      <DocsColumnResults
        count={item?.docs ?? 0}
        isLive={data?.status === 'running' && item?.pending !== 0}
      />
    ),
    [data?.status]
  );

  const renderAgentsColumn = useCallback((item) => {
    if (!item.action_id) return;

    return (
      <AgentsColumnResults
        successful={item?.successful ?? 0}
        pending={item?.pending ?? 0}
        failed={item?.failed ?? 0}
      />
    );
  }, []);

  const renderDiscoverResultsAction = useCallback(
    (item) => (
      <PackViewInDiscoverAction item={item} agentIds={agentIds} logsDataView={logsDataView} />
    ),
    [agentIds, logsDataView]
  );

  const renderLensResultsAction = useCallback(
    (item) => <PackViewInLensAction item={item} agentIds={agentIds} logsDataView={logsDataView} />,
    [agentIds, logsDataView]
  );

  const getHandleErrorsToggle = useCallback(
    (item) => () => {
      setItemIdToExpandedRowMap((prevValue) => {
        const itemIdToExpandedRowMapValues = { ...prevValue };
        if (itemIdToExpandedRowMapValues[item.id]) {
          delete itemIdToExpandedRowMapValues[item.id];
        } else {
          itemIdToExpandedRowMapValues[item.id] = (
            <EuiFlexGroup gutterSize="xl">
              <EuiFlexItem>
                <ResultTabs
                  actionId={item.action_id}
                  startDate={startDate}
                  ecsMapping={item.ecs_mapping}
                  endDate={expirationDate}
                  agentIds={agentIds}
                  failedAgentsCount={item?.failed ?? 0}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }

        return itemIdToExpandedRowMapValues;
      });
    },
    [agentIds, expirationDate, startDate]
  );

  const renderToggleResultsAction = useCallback(
    (item) => (
      <EuiButtonIcon
        onClick={getHandleErrorsToggle(item)}
        iconType={itemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'}
      />
    ),
    [getHandleErrorsToggle, itemIdToExpandedRowMap]
  );

  const getItemId = useCallback(
    (item: OsqueryManagerPackagePolicyInputStream) => get(item, 'id'),
    []
  );

  const columns = useMemo(
    () => [
      {
        field: 'id',
        name: i18n.translate('xpack.osquery.pack.queriesTable.idColumnTitle', {
          defaultMessage: 'ID',
        }),
        width: '15%',
        truncateText: true,
      },
      {
        field: 'query',
        name: i18n.translate('xpack.osquery.pack.queriesTable.queryColumnTitle', {
          defaultMessage: 'Query',
        }),
        render: renderQueryColumn,
        width: '40%',
      },
      {
        name: i18n.translate('xpack.osquery.pack.queriesTable.docsResultsColumnTitle', {
          defaultMessage: 'Docs',
        }),
        render: renderDocsColumn,
      },
      {
        name: i18n.translate('xpack.osquery.pack.queriesTable.agentsResultsColumnTitle', {
          defaultMessage: 'Agents',
        }),
        render: renderAgentsColumn,
      },
      {
        name: i18n.translate('xpack.osquery.pack.queriesTable.viewResultsColumnTitle', {
          defaultMessage: 'View results',
        }),
        width: '90px',
        actions: [
          {
            render: renderDiscoverResultsAction,
          },
          {
            render: renderLensResultsAction,
          },
        ],
      },
      {
        id: 'actions',
        width: '45px',
        isVisuallyHiddenLabel: true,
        alignment: RIGHT_ALIGNMENT,
        actions: [
          {
            render: renderToggleResultsAction,
          },
        ],
      },
    ],
    [
      renderQueryColumn,
      renderDocsColumn,
      renderAgentsColumn,
      renderDiscoverResultsAction,
      renderLensResultsAction,
      renderToggleResultsAction,
    ]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: 'id' as keyof OsqueryManagerPackagePolicyInputStream,
        direction: 'asc' as const,
      },
    }),
    []
  );

  return (
    <StyledEuiBasicTable
      // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
      items={data ?? []}
      itemId={getItemId}
      columns={columns}
      sorting={sorting}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      isExpandable
    />
  );
};

export const PackQueriesStatusTable = React.memo(PackQueriesStatusTableComponent);
