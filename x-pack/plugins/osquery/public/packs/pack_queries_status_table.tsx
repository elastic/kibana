/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiButtonIcon,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiSpacer,
  EuiPanel,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedTime, FormattedRelative } from '@kbn/i18n-react';
import moment from 'moment-timezone';

import type {
  TypedLensByValueInput,
  PersistedIndexPatternLayer,
  PieVisualizationState,
  TermsIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import { DOCUMENT_FIELD_NAME as RECORDS_FIELD } from '@kbn/lens-plugin/common/constants';
import { FilterStateStore, DataView } from '@kbn/data-plugin/common';
import { isEmpty } from 'lodash';
import { PackSOFormData } from './queries/use_pack_query_form';
import {
  ILastResult,
  fetchLastResults,
  lastResultsReducer,
  useFetchLastResults,
} from './queries/fetch_last_results';
import { useKibana } from '../common/lib/kibana';
import { ScheduledQueryErrorsTable } from './scheduled_query_errors_table';
import { usePackQueryLastResults } from './use_pack_query_last_results';
import { removeMultilines } from '../../common/utils/build_query/remove_multilines';

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
  actionId: string;
  agentIds?: string[];
  buttonType: ViewResultsActionButtonType;
  endDate?: string;
  startDate?: string;
  mode?: string;
}

function getLensAttributes(
  actionId: string,
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

  const agentIdsQuery = {
    bool: {
      minimum_should_match: 1,
      should: agentIds?.map((agentId) => ({ match_phrase: { 'agent.id': agentId } })),
    },
  };

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
      <EuiButtonIcon iconType="discoverApp" href={discoverUrl} aria-label={VIEW_IN_DISCOVER} />
    </EuiToolTip>
  );
};

export const ViewResultsInDiscoverAction = React.memo(ViewResultsInDiscoverActionComponent);

interface ScheduledQueryExpandedContentProps {
  actionId: string;
  agentIds?: string[];
  interval: number;
}

const ScheduledQueryExpandedContent = React.memo<ScheduledQueryExpandedContentProps>(
  ({ actionId, agentIds, interval }) => (
    <EuiFlexGroup direction="column" gutterSize="xl">
      <EuiFlexItem>
        <EuiSpacer size="m" />
        <EuiPanel paddingSize="s" hasBorder hasShadow={false}>
          <ScheduledQueryErrorsTable actionId={actionId} agentIds={agentIds} interval={interval} />
        </EuiPanel>
        <EuiSpacer size="m" />
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);

ScheduledQueryExpandedContent.displayName = 'ScheduledQueryExpandedContent';

const ScheduledQueryLastResults: React.FC<{ lastResult: ILastResult }> = ({ lastResult }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    <EuiFlexItem grow={false}>
      {lastResult?.['@timestamp'] ? (
        <EuiToolTip
          content={
            <>
              <FormattedDate
                value={lastResult['@timestamp']}
                year="numeric"
                month="short"
                day="2-digit"
              />{' '}
              <FormattedTime value={lastResult['@timestamp']} timeZoneName="short" />
            </>
          }
        >
          <FormattedRelative value={lastResult['@timestamp']} />
        </EuiToolTip>
      ) : (
        '-'
      )}
    </EuiFlexItem>
  </EuiFlexGroup>
);

const DocsColumnResults: React.FC<{ lastResult: ILastResult }> = ({ lastResult }) => {
  if (!lastResult) {
    return <>{'-'}</>;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiNotificationBadge color="subdued">{lastResult?.docCount ?? 0}</EuiNotificationBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const AgentsColumnResults: React.FC<{ lastResult: ILastResult }> = ({ lastResult }) => {
  if (!lastResult) {
    return <>{'-'}</>;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiNotificationBadge color="subdued">
          {lastResult?.uniqueAgentsCount ?? 0}
        </EuiNotificationBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const ErrorsColumnResults: React.FC<any> = ({ data, toggleErrors, expanded, id, interval }) => {
  const handleErrorsToggle = useCallback(
    () => toggleErrors({ id, interval }),
    [id, interval, toggleErrors]
  );

  if (!data) {
    return <>{'-'}</>;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge color={data?.total ? 'accent' : 'subdued'}>
            {data?.total ?? 0}
          </EuiNotificationBadge>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            isDisabled={!data?.total}
            onClick={handleErrorsToggle}
            iconType={expanded ? 'arrowUp' : 'arrowDown'}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

const getPackActionId = (actionId: string, packName: string) => `pack_${packName}_${actionId}`;

interface PackViewInActionProps {
  item: {
    id: string;
    interval: number;
  };
  logsDataView: DataView | undefined;
  packName: string;
  agentIds?: string[];
}

const PackViewInDiscoverActionComponent: React.FC<PackViewInActionProps> = ({
  item,
  logsDataView,
  packName,
  agentIds,
}) => {
  const { id, interval } = item;
  const actionId = getPackActionId(id, packName);
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
  packName,
  agentIds,
}) => {
  const { id, interval } = item;
  const actionId = getPackActionId(id, packName);
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
  data: PackSOFormData[];
  packName: string;
}

const PackQueriesStatusTableComponent: React.FC<PackQueriesStatusTableProps> = ({
  agentIds,
  data,
  packName,
}) => {
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
    Record<string, ReturnType<typeof ScheduledQueryExpandedContent>>
  >({});

  const kibanaData = useKibana().services.data;
  const { dataViews } = kibanaData;
  const [logsDataView, setLogsDataView] = useState<DataView | undefined>(undefined);

  const [lastResultsState, setLastResultsState] = React.useReducer(lastResultsReducer, {
    loading: false,
    lastResults: null,
    errorResults: null,
  });

  useEffect(() => {
    const fetchLogsDataView = async () => {
      const dataView = await dataViews.find('logs-*');

      setLogsDataView(dataView[0]);
    };

    fetchLogsDataView();
  }, [dataViews]);

  const { data: lastResultsData } = useFetchLastResults({
    data,
    packName,
    logsDataView,
  });
  useEffect(() => {
    (async () => {
      setLastResultsState({ type: 'setLastResults', payload: { loading: true } });
      try {
        const [lastResults] = await Promise.all([
          fetchLastResults({ kibanaData, data, packName, logsDataView }),
          // fetchLastResultsErrors({ kibanaData, data, packName, logsDataView }),
        ]);
        setLastResultsState({
          type: 'setLastResults',
          payload: { lastResults, loading: false },
        });
      } catch (e) {
        setLastResultsState({ type: 'setLastResults', payload: { loading: false } });
      }
    })();
  }, [data, kibanaData, logsDataView, packName]);

  const renderQueryColumn = useCallback((query?: string, item?) => {
    const singleLine = query && removeMultilines(query);
    const content =
      singleLine && singleLine.length > 55 ? `${singleLine?.substring(0, 55)}...` : singleLine;

    return (
      <EuiToolTip title={item?.id} content={<EuiFlexItem>{query}</EuiFlexItem>}>
        <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
          {content}
        </EuiCodeBlock>
      </EuiToolTip>
    );
  }, []);

  const toggleErrors = useCallback(
    ({ queryId, interval }: { queryId: string; interval: number }) => {
      const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
      if (itemIdToExpandedRowMapValues[queryId]) {
        delete itemIdToExpandedRowMapValues[queryId];
      } else {
        itemIdToExpandedRowMapValues[queryId] = (
          <ScheduledQueryExpandedContent
            actionId={getPackActionId(queryId, packName)}
            agentIds={agentIds}
            interval={interval}
          />
        );
      }

      setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
    },
    [agentIds, itemIdToExpandedRowMap, packName]
  );

  const renderLastResultsColumn = useCallback(
    (item) => {
      if (lastResultsState.loading) {
        return <EuiLoadingSpinner />;
      }

      if (lastResultsState.lastResults == null) {
        return <>{'-'}</>;
      }

      return <ScheduledQueryLastResults lastResult={lastResultsState.lastResults[item.id]} />;
    },
    [lastResultsState.lastResults, lastResultsState.loading]
  );

  const renderDocsColumn = useCallback(
    (item) => {
      if (lastResultsState.loading) {
        return <EuiLoadingSpinner />;
      }

      if (lastResultsState.lastResults == null) {
        return <>{'-'}</>;
      }

      return <DocsColumnResults lastResult={lastResultsState.lastResults[item.id]} />;
    },
    [lastResultsState.lastResults, lastResultsState.loading]
  );
  const renderAgentsColumn = useCallback(
    (item) => {
      if (lastResultsState.loading) {
        return <EuiLoadingSpinner />;
      }

      if (lastResultsState.lastResults == null) {
        return <>{'-'}</>;
      }

      return <AgentsColumnResults lastResult={lastResultsState.lastResults[item.id]} />;
    },
    [lastResultsState.lastResults, lastResultsState.loading]
  );
  const renderErrorsColumn = useCallback(
    (item) => {
      if (lastResultsState.loading) {
        return <EuiLoadingSpinner />;
      }

      if (isEmpty(lastResultsState.lastResults) || lastResultsState.errorResults == null) {
        return <>{'-'}</>;
      }

      return (
        <ErrorsColumnResults
          id={item.id}
          interval={item.interval}
          data={lastResultsState.errorResults[item.id]}
          toggleErrors={toggleErrors}
          expanded={!!itemIdToExpandedRowMap[item.id]}
        />
      );
    },
    [itemIdToExpandedRowMap, lastResultsState, toggleErrors]
  );

  const renderDiscoverResultsAction = useCallback(
    (item) => (
      <PackViewInDiscoverAction
        item={item}
        agentIds={agentIds}
        logsDataView={logsDataView}
        packName={packName}
      />
    ),
    [agentIds, logsDataView, packName]
  );

  const renderLensResultsAction = useCallback(
    (item) => (
      <PackViewInLensAction
        item={item}
        agentIds={agentIds}
        logsDataView={logsDataView}
        packName={packName}
      />
    ),
    [agentIds, logsDataView, packName]
  );

  const getItemId = useCallback((item: PackSOFormData) => get('id', item), []);

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
        field: 'interval',
        name: i18n.translate('xpack.osquery.pack.queriesTable.intervalColumnTitle', {
          defaultMessage: 'Interval (s)',
        }),
        width: '80px',
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
        name: i18n.translate('xpack.osquery.pack.queriesTable.lastResultsColumnTitle', {
          defaultMessage: 'Last results',
        }),
        render: renderLastResultsColumn,
        width: '12%',
      },
      {
        name: i18n.translate('xpack.osquery.pack.queriesTable.cocsResultsColumnTitle', {
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
        name: i18n.translate('xpack.osquery.pack.queriesTable.errorsResultsColumnTitle', {
          defaultMessage: 'Errors',
        }),
        render: renderErrorsColumn,
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
    ],
    [
      renderQueryColumn,
      renderLastResultsColumn,
      renderDocsColumn,
      renderAgentsColumn,
      renderErrorsColumn,
      renderDiscoverResultsAction,
      renderLensResultsAction,
    ]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: 'id' as keyof PackSOFormData,
        direction: 'asc' as const,
      },
    }),
    []
  );

  return (
    <EuiBasicTable<PackSOFormData>
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
