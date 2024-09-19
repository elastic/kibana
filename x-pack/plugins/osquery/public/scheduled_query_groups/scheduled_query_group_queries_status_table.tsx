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
  EuiSpacer,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedDate, FormattedTime, FormattedRelative } from '@kbn/i18n/react';

import {
  TypedLensByValueInput,
  PersistedIndexPatternLayer,
  PieVisualizationState,
} from '../../../lens/public';
import { FilterStateStore, IndexPattern } from '../../../../../src/plugins/data/common';
import { useKibana, isModifiedEvent, isLeftClickEvent } from '../common/lib/kibana';
import { OsqueryManagerPackagePolicyInputStream } from '../../common/types';
import { ScheduledQueryErrorsTable } from './scheduled_query_errors_table';
import { useScheduledQueryGroupQueryLastResults } from './use_scheduled_query_group_query_last_results';
import { useScheduledQueryGroupQueryErrors } from './use_scheduled_query_group_query_errors';

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
        ...(agentIdsQuery
          ? [
              {
                $state: { store: FilterStateStore.APP_STATE },
                meta: {
                  alias: 'agent IDs',
                  disabled: false,
                  indexRefName: 'filter-index-pattern-0',
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

  const handleClick = useCallback(
    (event) => {
      const openInNewTab = !(!isModifiedEvent(event) && isLeftClickEvent(event));

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
          openInNewTab,
        }
      );
    },
    [actionId, agentIds, endDate, lensService, mode, startDate]
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
  agentIds,
  buttonType,
  endDate,
  startDate,
}) => {
  const urlGenerator = useKibana().services.discover?.urlGenerator;
  const [discoverUrl, setDiscoverUrl] = useState<string>('');

  useEffect(() => {
    const getDiscoverUrl = async () => {
      if (!urlGenerator?.createUrl) return;

      const agentIdsQuery = agentIds?.length
        ? {
            bool: {
              minimum_should_match: 1,
              should: agentIds.map((agentId) => ({ match_phrase: { 'agent.id': agentId } })),
            },
          }
        : null;

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
  }, [actionId, agentIds, endDate, startDate, urlGenerator]);

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

interface ScheduledQueryLastResultsProps {
  actionId: string;
  agentIds: string[];
  queryId: string;
  interval: number;
  toggleErrors: (payload: { queryId: string; interval: number }) => void;
  expanded: boolean;
}

const ScheduledQueryLastResults: React.FC<ScheduledQueryLastResultsProps> = ({
  actionId,
  agentIds,
  queryId,
  interval,
  toggleErrors,
  expanded,
}) => {
  const data = useKibana().services.data;
  const [logsIndexPattern, setLogsIndexPattern] = useState<IndexPattern | undefined>(undefined);

  const { data: lastResultsData, isFetched } = useScheduledQueryGroupQueryLastResults({
    actionId,
    agentIds,
    interval,
    logsIndexPattern,
  });

  const { data: errorsData, isFetched: errorsFetched } = useScheduledQueryGroupQueryErrors({
    actionId,
    agentIds,
    interval,
    logsIndexPattern,
  });

  const handleErrorsToggle = useCallback(
    () => toggleErrors({ queryId, interval }),
    [queryId, interval, toggleErrors]
  );

  useEffect(() => {
    const fetchLogsIndexPattern = async () => {
      const indexPattern = await data.indexPatterns.find('logs-*');

      setLogsIndexPattern(indexPattern[0]);
    };
    fetchLogsIndexPattern();
  }, [data.indexPatterns]);

  if (!isFetched || !errorsFetched) {
    return <EuiLoadingSpinner />;
  }

  if (!lastResultsData && !errorsData?.total) {
    return <>{'-'}</>;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={4}>
        {lastResultsData?.['@timestamp'] ? (
          <EuiToolTip
            content={
              <>
                <FormattedDate
                  value={lastResultsData['@timestamp']}
                  year="numeric"
                  month="short"
                  day="2-digit"
                />{' '}
                <FormattedTime value={lastResultsData['@timestamp']} timeZoneName="short" />
              </>
            }
          >
            <FormattedRelative value={lastResultsData['@timestamp']} />
          </EuiToolTip>
        ) : (
          '-'
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={4}>
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color="subdued">
              {lastResultsData?.docCount ?? 0}
            </EuiNotificationBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.osquery.queriesStatusTable.documentLabelText"
              defaultMessage="{count, plural, one {Document} other {Documents}}"
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              values={{ count: lastResultsData?.docCount as number }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={4}>
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color="subdued">
              {lastResultsData?.uniqueAgentsCount ?? 0}
            </EuiNotificationBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.osquery.queriesStatusTable.agentsLabelText"
              defaultMessage="{count, plural, one {Agent} other {Agents}}"
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              values={{ count: agentIds?.length }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={5}>
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color={errorsData?.total ? 'accent' : 'subdued'}>
              {errorsData?.total ?? 0}
            </EuiNotificationBadge>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            {' '}
            <FormattedMessage
              id="xpack.osquery.queriesStatusTable.errorsLabelText"
              defaultMessage="{count, plural, one {Error} other {Errors}}"
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              values={{ count: errorsData?.total as number }}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              isDisabled={!errorsData?.total}
              onClick={handleErrorsToggle}
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
  agentIds?: string[];
  data: OsqueryManagerPackagePolicyInputStream[];
  scheduledQueryGroupName: string;
}

const ScheduledQueryGroupQueriesStatusTableComponent: React.FC<ScheduledQueryGroupQueriesStatusTableProps> =
  ({ agentIds, data, scheduledQueryGroupName }) => {
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
              agentIds={agentIds}
              interval={interval}
            />
          );
        }
        setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
      },
      [agentIds, itemIdToExpandedRowMap, scheduledQueryGroupName]
    );

    const renderLastResultsColumn = useCallback(
      (item) => (
        <ScheduledQueryLastResults
          // @ts-expect-error update types
          agentIds={agentIds}
          queryId={item.vars.id.value}
          actionId={getPackActionId(item.vars.id.value, scheduledQueryGroupName)}
          interval={item.vars?.interval.value}
          toggleErrors={toggleErrors}
          expanded={!!itemIdToExpandedRowMap[item.vars.id.value]}
        />
      ),
      [agentIds, itemIdToExpandedRowMap, scheduledQueryGroupName, toggleErrors]
    );

    const renderDiscoverResultsAction = useCallback(
      (item) => (
        <ViewResultsInDiscoverAction
          actionId={getPackActionId(item.vars?.id.value, scheduledQueryGroupName)}
          agentIds={agentIds}
          buttonType={ViewResultsActionButtonType.icon}
          startDate={`now-${item.vars?.interval.value * 2}s`}
          endDate="now"
          mode="relative"
        />
      ),
      [agentIds, scheduledQueryGroupName]
    );

    const renderLensResultsAction = useCallback(
      (item) => (
        <ViewResultsInLensAction
          actionId={getPackActionId(item.vars?.id.value, scheduledQueryGroupName)}
          agentIds={agentIds}
          buttonType={ViewResultsActionButtonType.icon}
          startDate={`now-${item.vars?.interval.value * 2}s`}
          endDate="now"
          mode="relative"
        />
      ),
      [agentIds, scheduledQueryGroupName]
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
          name: i18n.translate(
            'xpack.osquery.scheduledQueryGroup.queriesTable.intervalColumnTitle',
            {
              defaultMessage: 'Interval (s)',
            }
          ),
          width: '80px',
        },
        {
          field: 'vars.query.value',
          name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.queryColumnTitle', {
            defaultMessage: 'Query',
          }),
          render: renderQueryColumn,
          width: '20%',
        },
        {
          name: i18n.translate(
            'xpack.osquery.scheduledQueryGroup.queriesTable.lastResultsColumnTitle',
            {
              defaultMessage: 'Last results',
            }
          ),
          render: renderLastResultsColumn,
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
