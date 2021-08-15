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
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQuery } from 'react-query';

import {
  TypedLensByValueInput,
  PersistedIndexPatternLayer,
  PieVisualizationState,
} from '../../../lens/public';
import { FilterStateStore } from '../../../../../src/plugins/data/common';
import { useKibana, isModifiedEvent, isLeftClickEvent } from '../common/lib/kibana';
import { OsqueryManagerPackagePolicyInputStream } from '../../common/types';
import { ScheduledQueryErrorsTable } from './scheduled_query_errors_table';

const VIEW_IN_DISCOVER = i18n.translate(
  'xpack.osquery.scheduledQueryGroup.queriesTable.viewDiscoverResultsActionAriaLabel',
  {
    defaultMessage: 'View in Discover',
  }
);

const VIEW_IN_LENS = i18n.translate(
  'xpack.osquery.scheduledQueryGroup.queriesTable.viewLensResultsActionAriaLabel',
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
  buttonType: ViewResultsActionButtonType;
  endDate?: string;
  startDate?: string;
}

function getLensAttributes(actionId: string): TypedLensByValueInput['attributes'] {
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
      },
      'ed999e9d-204c-465b-897f-fe1a125b39ed': {
        sourceField: 'Records',
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
            indexRefName: 'filter-index-pattern-0',
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
      ],
      query: { language: 'kuery', query: '' },
      visualization: xyConfig,
    },
  };
}

const ViewResultsInLensActionComponent: React.FC<ViewResultsInDiscoverActionProps> = ({
  actionId,
  buttonType,
  endDate,
  startDate,
}) => {
  const lensService = useKibana().services.lens;

  const handleClick = useCallback(
    (event) => {
      const openInNewWindow = !(!isModifiedEvent(event) && isLeftClickEvent(event));

      event.preventDefault();

      lensService?.navigateToPrefilledEditor(
        {
          id: '',
          timeRange: {
            from: startDate ?? 'now-1d',
            to: endDate ?? 'now',
            mode: startDate || endDate ? 'absolute' : 'relative',
          },
          attributes: getLensAttributes(actionId),
        },
        openInNewWindow
      );
    },
    [actionId, endDate, lensService, startDate]
  );

  if (buttonType === ViewResultsActionButtonType.button) {
    return (
      <EuiButtonEmpty
        size="xs"
        iconType="lensApp"
        onClick={handleClick}
        disabled={!lensService?.canUseEditor()}
      >
        {VIEW_IN_LENS}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiToolTip content={VIEW_IN_LENS}>
      <EuiButtonIcon
        iconType="lensApp"
        disabled={!lensService?.canUseEditor()}
        onClick={handleClick}
        aria-label={VIEW_IN_LENS}
      />
    </EuiToolTip>
  );
};

export const ViewResultsInLensAction = React.memo(ViewResultsInLensActionComponent);

const ViewResultsInDiscoverActionComponent: React.FC<ViewResultsInDiscoverActionProps> = ({
  actionId,
  buttonType,
  endDate,
  startDate,
}) => {
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
              params: { query: actionId },
            },
            query: { match_phrase: { action_id: actionId } },
            $state: { store: FilterStateStore.APP_STATE },
          },
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
  }, [actionId, endDate, startDate, urlGenerator]);

  if (buttonType === ViewResultsActionButtonType.button) {
    return (
      <EuiButtonEmpty size="xs" iconType="discoverApp" href={discoverUrl}>
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
  interval: number;
}

const ScheduledQueryExpandedContent = React.memo<ScheduledQueryExpandedContentProps>(
  ({ actionId, interval }) => (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <ScheduledQueryErrorsTable actionId={actionId} interval={interval} />
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);

ScheduledQueryExpandedContent.displayName = 'ScheduledQueryExpandedContent';

interface ScheduledQueryLastResultsProps {
  actionId: string;
  queryId: string;
  interval: number;
  toggleErrors: (payload: { queryId: string; interval: number }) => void;
  expanded: boolean;
}

const ScheduledQueryLastResults: React.FC<ScheduledQueryLastResultsProps> = ({
  actionId,
  queryId,
  interval,
  toggleErrors,
  expanded,
}) => {
  const data = useKibana().services.data;

  const { data: lastResultsData, isFetched } = useQuery(
    ['scheduledQueryLastResults', { queryId }],
    async () => {
      const indexPattern = await data.indexPatterns.find('logs-*');
      const searchSource = await data.search.searchSource.create({
        index: indexPattern[0],
        aggs: {
          runs: {
            terms: {
              field: 'response_id',
              order: { first_event_ingested_time: 'desc' },
              size: 1,
            },
            aggs: {
              first_event_ingested_time: { min: { field: 'event.ingested' } },
              unique_agents: { cardinality: { field: 'agent.id' } },
            },
          },
        },
        filter: [
          {
            meta: {
              alias: null,
              disabled: false,
              negate: false,
              key: 'action_id',
              value: actionId,
            },
            query: {
              match_phrase: {
                action_id: actionId,
              },
            },
          },
        ],
      });

      const responseData = await searchSource.fetch$().toPromise();

      // @ts-expect-error update types
      return responseData.rawResponse.aggregations?.runs?.buckets[0];
    }
  );

  const { data: errorsData, isFetched: errorsFetched } = useQuery(
    ['scheduledQueryErrors', { actionId, interval }],
    async () => {
      const indexPattern = await data.indexPatterns.find('logs-*');
      const searchSource = await data.search.searchSource.create({
        index: indexPattern[0],
        query: {
          // @ts-expect-error update types
          bool: {
            filter: [
              {
                match_phrase: {
                  message: 'Error',
                },
              },
              {
                term: {
                  'data_stream.dataset': 'elastic_agent.osquerybeat',
                },
              },
              {
                match_phrase: {
                  message: actionId,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: `now-${interval * 2}s`,
                    lte: 'now',
                  },
                },
              },
            ],
          },
        },
        size: 0,
      });

      const responseData = await searchSource.fetch$().toPromise();

      return responseData;
    }
  );

  const handleErrorsToggle = useCallback(() => toggleErrors({ queryId, interval }), [
    queryId,
    interval,
    toggleErrors,
  ]);

  if (!isFetched || !errorsFetched) {
    return <EuiLoadingSpinner />;
  }

  // if (!lastResultsData) {
  //   return <>{'-'}</>;
  // }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {/* <EuiFlexItem>{moment(lastResultsData.first_event_ingested_time.value).fromNow()}</EuiFlexItem> */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color="subdued">
              {lastResultsData?.doc_count ?? 0}
            </EuiNotificationBadge>
          </EuiFlexItem>
          <EuiFlexItem>{'Documents'}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color="subdued">
              {lastResultsData?.unique_agents.value ?? 0}
            </EuiNotificationBadge>
          </EuiFlexItem>
          <EuiFlexItem>{'Agents'}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color={errorsData?.rawResponse.hits.total ? 'accent' : 'subdued'}>
              {errorsData?.rawResponse.hits.total ?? 0}
            </EuiNotificationBadge>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>{'Errors'}</EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              isDisabled={!errorsData?.rawResponse.hits.total}
              onClick={handleErrorsToggle}
              aria-label={expanded ? 'Collapse' : 'Expand'}
              iconType={expanded ? 'arrowUp' : 'arrowDown'}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const getPackActionId = (actionId: string, packName: string) => `pack_${packName}_${actionId}`;

interface ScheduledQueryGroupQueriesStatusTableProps {
  data: OsqueryManagerPackagePolicyInputStream[];
  scheduledQueryGroupName: string;
}

const ScheduledQueryGroupQueriesStatusTableComponent: React.FC<ScheduledQueryGroupQueriesStatusTableProps> = ({
  data,
  scheduledQueryGroupName,
}) => {
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
    Record<string, ReturnType<typeof ScheduledQueryExpandedContent>>
  >({});

  const renderQueryColumn = useCallback(
    (query: string) => (
      <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
        {query}
      </EuiCodeBlock>
    ),
    []
  );

  const toggleErrors = useCallback(
    ({ queryId, interval }: { queryId: string; interval: number }) => {
      const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
      if (itemIdToExpandedRowMapValues[queryId]) {
        delete itemIdToExpandedRowMapValues[queryId];
      } else {
        itemIdToExpandedRowMapValues[queryId] = (
          <ScheduledQueryExpandedContent
            actionId={getPackActionId(queryId, scheduledQueryGroupName)}
            interval={interval}
          />
        );
      }
      setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
    },
    [itemIdToExpandedRowMap, scheduledQueryGroupName]
  );

  const renderLastResultsColumn = useCallback(
    (item) => (
      <>
        <ScheduledQueryLastResults
          queryId={item.vars.id.value}
          actionId={getPackActionId(item.vars.id.value, scheduledQueryGroupName)}
          interval={item.vars?.interval.value}
          toggleErrors={toggleErrors}
          expanded={!!itemIdToExpandedRowMap[item.id]}
        />
      </>
    ),
    [itemIdToExpandedRowMap, scheduledQueryGroupName, toggleErrors]
  );

  const renderDiscoverResultsAction = useCallback(
    (item) => (
      <ViewResultsInDiscoverAction
        actionId={getPackActionId(item.vars?.id.value, scheduledQueryGroupName)}
        buttonType={ViewResultsActionButtonType.icon}
      />
    ),
    [scheduledQueryGroupName]
  );

  const renderLensResultsAction = useCallback(
    (item) => (
      <ViewResultsInLensAction
        actionId={item.vars?.id.value}
        buttonType={ViewResultsActionButtonType.icon}
      />
    ),
    []
  );

  const getItemId = useCallback(
    (item: OsqueryManagerPackagePolicyInputStream) => get('vars.id.value', item),
    []
  );

  const columns = useMemo(
    () => [
      {
        field: 'vars.id.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.idColumnTitle', {
          defaultMessage: 'ID',
        }),
        width: '15%',
      },
      {
        field: 'vars.interval.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.intervalColumnTitle', {
          defaultMessage: 'Interval (s)',
        }),
        width: '80px',
      },
      {
        field: 'vars.query.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.queryColumnTitle', {
          defaultMessage: 'Query',
        }),
        render: renderQueryColumn,
      },
      {
        name: i18n.translate(
          'xpack.osquery.scheduledQueryGroup.queriesTable.lastResultsColumnTitle',
          {
            defaultMessage: 'Last results',
          }
        ),
        render: renderLastResultsColumn,
        width: '500px',
      },
      {
        name: i18n.translate(
          'xpack.osquery.scheduledQueryGroup.queriesTable.viewResultsColumnTitle',
          {
            defaultMessage: 'View results',
          }
        ),
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
      renderDiscoverResultsAction,
      renderLensResultsAction,
    ]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: 'vars.id.value' as keyof OsqueryManagerPackagePolicyInputStream,
        direction: 'asc' as const,
      },
    }),
    []
  );

  return (
    <EuiBasicTable<OsqueryManagerPackagePolicyInputStream>
      items={data}
      itemId={getItemId}
      columns={columns}
      sorting={sorting}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      isExpandable
    />
  );
};

export const ScheduledQueryGroupQueriesStatusTable = React.memo(
  ScheduledQueryGroupQueriesStatusTableComponent
);
