/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { NodeViewModel } from '@kbn/cloud-security-posture-graph';
import { buildEsQuery } from '@kbn/es-query';
import type { Filter, Query, TimeRange, BoolQuery } from '@kbn/es-query';
import { css } from '@emotion/css';
import { getEsQueryConfig } from '@kbn/data-service';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { useDocumentDetailsContext } from '../../shared/context';
import { GRAPH_VISUALIZATION_TEST_ID } from './test_ids';
import { useFetchGraphData } from '../../right/hooks/use_fetch_graph_data';
import { useGraphPreview } from '../../right/hooks/use_graph_preview';
import { useGraphNodeExpandPopover } from './use_graph_node_expand_popover';

export const GRAPH_VISUALIZATION_ID = 'graph_visualization';
const DEFAULT_FROM = 'now-60d/d';
const DEFAULT_TO = 'now/d';

const GraphLazy = React.lazy(() =>
  import('@kbn/cloud-security-posture-graph').then((module) => ({ default: module.Graph }))
);

const useTimeRange = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>({
    from: DEFAULT_FROM,
    to: DEFAULT_TO,
  });

  const setPartialTimeRange = (newTimeRange: Partial<typeof timeRange>) => {
    setTimeRange((currTimeRange) => ({ ...currTimeRange, ...newTimeRange }));
  };

  return { timeRange, setTimeRange, setPartialTimeRange };
};

const useGraphData = (eventIds: string[], timeRange: TimeRange, filter: { bool: BoolQuery }) => {
  const { data, refresh, isFetching } = useFetchGraphData({
    req: {
      query: {
        eventIds,
        esQuery: filter,
        start: timeRange.from,
        end: timeRange.to,
      },
    },
    options: {
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    },
  });

  return { data, refresh, isFetching };
};

const useGraphPopovers = (
  setActorIds: React.Dispatch<React.SetStateAction<Set<string>>>,
  setSearchFilters: React.Dispatch<React.SetStateAction<Filter[]>>
) => {
  const {
    services: { notifications },
  } = useKibana();

  const nodeExpandPopover = useGraphNodeExpandPopover({
    onExploreRelatedEntitiesClick: (node) => {
      setSearchFilters((prev) => [
        ...prev,
        {
          meta: {
            disabled: false,
            key: 'related.entity',
            field: 'related.entity',
            negate: false,
            params: {
              query: node.id,
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'related.entity': node.id,
            },
          },
          $state: {
            store: 'appState',
          } as Filter['$state'],
        },
      ]);
    },
    onShowActionsByEntityClick: (node) => {
      setActorIds((prev) => new Set([...prev, node.id]));
      setSearchFilters((prev) => [
        ...prev,
        {
          meta: {
            disabled: false,
            key: 'actor.entity.id',
            field: 'actor.entity.id',
            negate: false,
            params: {
              query: node.id,
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'actor.entity.id': node.id,
            },
          },
          $state: {
            store: 'appState',
          } as Filter['$state'],
        },
      ]);
    },
    onShowActionsOnEntityClick: (node) => {
      setSearchFilters((prev) => [
        ...prev,
        {
          meta: {
            disabled: false,
            key: 'target.entity.id',
            field: 'target.entity.id',
            negate: false,
            params: {
              query: node.id,
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'target.entity.id': node.id,
            },
          },
          $state: {
            store: 'appState',
          } as Filter['$state'],
        },
      ]);
    },
    onViewEntityDetailsClick: (node) => {
      notifications?.toasts.addInfo('View entity details is not implemented yet');
    },
  });

  const popovers = [nodeExpandPopover];
  const popoverOpenWrapper = (cb: Function, ...args: unknown[]) => {
    popovers.forEach(({ actions: { closePopover } }) => {
      closePopover();
    });
    cb(...args);
  };

  return { nodeExpandPopover, popoverOpenWrapper };
};

const useGraphNodes = (
  nodes: NodeViewModel[],
  expandButtonClickHandler: (...args: unknown[]) => void
) => {
  return useMemo(() => {
    return nodes.map((node) => {
      const nodeHandlers =
        node.shape !== 'label' && node.shape !== 'group'
          ? {
              expandButtonClick: expandButtonClickHandler,
            }
          : undefined;
      return { ...node, ...nodeHandlers };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);
};

/**
 * Graph visualization view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const GraphVisualization: React.FC = memo(() => {
  const { indexPattern } = useSourcererDataView(SourcererScopeName.default);
  const [searchFilters, setSearchFilters] = useState<Filter[]>(() => []);
  const { timeRange, setTimeRange } = useTimeRange();
  const { getFieldsData, dataAsNestedObject } = useDocumentDetailsContext();
  const { eventIds } = useGraphPreview({
    getFieldsData,
    ecsData: dataAsNestedObject,
  });

  const {
    services: { uiSettings },
  } = useKibana();
  const [query, setQuery] = useState<{ bool: BoolQuery }>(
    buildEsQuery(
      indexPattern,
      [],
      [...searchFilters],
      getEsQueryConfig(uiSettings as Parameters<typeof getEsQueryConfig>[0])
    )
  );

  useEffect(() => {
    setQuery(
      buildEsQuery(
        indexPattern,
        [],
        [...searchFilters],
        getEsQueryConfig(uiSettings as Parameters<typeof getEsQueryConfig>[0])
      )
    );
  }, [searchFilters, indexPattern, uiSettings]);

  const { nodeExpandPopover, popoverOpenWrapper } = useGraphPopovers(setActorIds, setSearchFilters);
  const expandButtonClickHandler = (...args: unknown[]) =>
    popoverOpenWrapper(nodeExpandPopover.onNodeExpandButtonClick, ...args);
  const isPopoverOpen = [nodeExpandPopover].some(({ state: { isOpen } }) => isOpen);
  const { data, refresh, isFetching } = useGraphData(eventIds, timeRange, query);
  const nodes = useGraphNodes(data?.nodes ?? [], expandButtonClickHandler);

  return (
    <div data-test-subj={GRAPH_VISUALIZATION_TEST_ID}>
      <SearchBar<Query>
        {...{
          appName: 'graph-visualization',
          intl: null,
          showFilterBar: true,
          showDatePicker: true,
          showAutoRefreshOnly: false,
          showSaveQuery: false,
          showQueryInput: false,
          isLoading: isFetching,
          isAutoRefreshDisabled: true,
          dateRangeFrom: timeRange.from.split('/')[0],
          dateRangeTo: timeRange.to.split('/')[0],
          query: { query: '', language: 'kuery' },
          indexPatterns: [indexPattern],
          filters: searchFilters,
          submitButtonStyle: 'iconOnly',
          onFiltersUpdated: (newFilters) => {
            setSearchFilters(newFilters);
          },
          onQuerySubmit: (payload, isUpdate) => {
            if (isUpdate) {
              setTimeRange({ from: payload.dateRange.from, to: payload.dateRange.to });
            } else {
              refresh();
            }
          },
        }}
      />
      <React.Suspense fallback={null}>
        <GraphLazy
          css={css`
            height: calc(100vh - 305px);
            width: 100%;
          `}
          nodes={nodes}
          edges={data?.edges ?? []}
          interactive={true}
          isLocked={isPopoverOpen}
        />
      </React.Suspense>
      <nodeExpandPopover.PopoverComponent />
    </div>
  );
});

GraphVisualization.displayName = 'GraphVisualization';
