/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isEntityNode } from '@kbn/cloud-security-posture-graph';
import type { NodeViewModel } from '@kbn/cloud-security-posture-graph';
import {
  BooleanRelation,
  buildEsQuery,
  isCombinedFilter,
  buildCombinedFilter,
  isPhraseFilter,
} from '@kbn/es-query';
import type { Filter, Query, TimeRange, BoolQuery, PhraseFilter } from '@kbn/es-query';
import { css } from '@emotion/css';
import { getEsQueryConfig } from '@kbn/data-service';
import dateMath from '@kbn/datemath';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { TableId } from '@kbn/securitysolution-data-table';
import { normalizeTimeRange } from '../../../../common/utils/normalize_time_range';
import { InvestigateInTimelineButton } from '../../../../common/components/event_details/investigate_in_timeline_button';
import { useGetScopedSourcererDataView } from '../../../../sourcerer/components/use_get_sourcerer_data_view';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { useDocumentDetailsContext } from '../../shared/context';
import { GRAPH_VISUALIZATION_TEST_ID } from './test_ids';
import { useFetchGraphData } from '../../shared/hooks/use_fetch_graph_data';
import { useGraphPreview } from '../../shared/hooks/use_graph_preview';
import { useGraphNodeExpandPopover } from './use_graph_node_expand_popover';
import { useGraphLabelExpandPopover } from './use_graph_label_expand_popover';
import { ALERT_PREVIEW_BANNER, EVENT_PREVIEW_BANNER } from '../../preview/constants';
import { DocumentDetailsPreviewPanelKey } from '../../shared/constants/panel_keys';

export const GRAPH_VISUALIZATION_ID = 'graph_visualization';
const CONTROLLED_BY_GRAPH_VISUALIZATION_FILTER = 'graph-visualization';

const GraphLazy = React.lazy(() =>
  import('@kbn/cloud-security-posture-graph').then((module) => ({ default: module.Graph }))
);

const useTimeRange = (timestamp: string) => {
  const [timeRange, setTimeRange] = useState<TimeRange>({
    from: `${timestamp}||-30m`,
    to: `${timestamp}||+30m`,
  });

  const setPartialTimeRange = (newTimeRange: Partial<typeof timeRange>) => {
    setTimeRange((currTimeRange) => ({ ...currTimeRange, ...newTimeRange }));
  };

  return { timeRange, setTimeRange, setPartialTimeRange };
};

const useGraphData = (
  eventIds: string[],
  isAlert: boolean,
  timeRange: TimeRange,
  filter: { bool: BoolQuery }
) => {
  const { data, refresh, isFetching } = useFetchGraphData({
    req: {
      query: {
        eventIds: isAlert ? eventIds : [],
        esQuery: filter,
        start: timeRange.from,
        end: timeRange.to,
      },
      nodesLimit: 50,
      showUnknownTarget: false,
    },
    options: {
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    },
  });

  return { data, refresh, isFetching };
};

const buildPhraseFilter = (field: string, value: string, dataViewId?: string): PhraseFilter => ({
  meta: {
    key: field,
    index: dataViewId,
    negate: false,
    disabled: false,
    type: 'phrase',
    field,
    controlledBy: CONTROLLED_BY_GRAPH_VISUALIZATION_FILTER,
    params: {
      query: value,
    },
  },
  query: {
    match_phrase: {
      [field]: value,
    },
  },
});

const addFilter = (dataViewId: string, prev: Filter[], key: string, value: string) => {
  const [firstFilter, ...otherFilters] = prev;

  if (isCombinedFilter(firstFilter) && firstFilter?.meta?.relation === BooleanRelation.OR) {
    return [
      {
        ...firstFilter,
        meta: {
          ...firstFilter.meta,
          params: [
            ...(Array.isArray(firstFilter.meta.params) ? firstFilter.meta.params : []),
            buildPhraseFilter(key, value),
          ],
        },
      },
      ...otherFilters,
    ];
  } else if (isPhraseFilter(firstFilter)) {
    return [
      buildCombinedFilter(BooleanRelation.OR, [firstFilter, buildPhraseFilter(key, value)], {
        id: dataViewId,
      }),
      ...otherFilters,
    ];
  } else {
    return [buildPhraseFilter(key, value, dataViewId), ...prev];
  }
};

type NodeEventOnClick = ({
  documentId,
  indexName,
  scopeId,
  isAlert,
}: {
  documentId: string | undefined;
  indexName: string | undefined;
  scopeId: string;
  isAlert: boolean;
}) => void;

const useGraphPopovers = (
  dataViewId: string,
  setSearchFilters: React.Dispatch<React.SetStateAction<Filter[]>>
) => {
  const { openPreviewPanel } = useExpandableFlyoutApi();

  const openPreview = useCallback<NodeEventOnClick>(
    ({ documentId, indexName, scopeId, isAlert }) => {
      openPreviewPanel({
        id: DocumentDetailsPreviewPanelKey,
        params: {
          id: documentId,
          indexName,
          scopeId,
          isPreviewMode: true,
          banner: isAlert ? ALERT_PREVIEW_BANNER : EVENT_PREVIEW_BANNER,
        },
      });
    },
    [openPreviewPanel]
  );

  const nodeExpandPopover = useGraphNodeExpandPopover({
    onExploreRelatedEntitiesClick: (node) => {
      setSearchFilters((prev) => addFilter(dataViewId, prev, 'related.entity', node.id));
    },
    onShowActionsByEntityClick: (node) => {
      setSearchFilters((prev) => addFilter(dataViewId, prev, 'actor.entity.id', node.id));
    },
    onShowActionsOnEntityClick: (node) => {
      setSearchFilters((prev) => addFilter(dataViewId, prev, 'target.entity.id', node.id));
    },
    // onViewEntityDetailsClick: (node) => {
    //
    // },
  });

  const labelExpandPopover = useGraphLabelExpandPopover({
    onShowEventsWithThisActionClick: (node) => {
      setSearchFilters((prev) =>
        addFilter(dataViewId, prev, 'event.action', node.data.label ?? '')
      );
    },
    onViewEventDetailsClick: (node) => {
      openPreview({
        documentId: node.data.lastEventId,
        indexName: 'logs-gcp.audit-default',
        scopeId: TableId.alertsOnAlertsPage,
        isAlert: node.data.color === 'primary',
      });
    },
  });

  const popovers = [nodeExpandPopover, labelExpandPopover];
  const popoverOpenWrapper = (cb: Function, ...args: unknown[]) => {
    popovers.forEach(({ actions: { closePopover } }) => {
      closePopover();
    });
    cb(...args);
  };

  return { nodeExpandPopover, labelExpandPopover, popoverOpenWrapper };
};

const useGraphNodes = (
  nodes: NodeViewModel[],
  nodeExpandButtonClickHandler: (...args: unknown[]) => void,
  labelExpandButtonClickHandler: (...args: unknown[]) => void
) => {
  return useMemo(() => {
    return nodes.map((node) => {
      if (isEntityNode(node)) {
        return {
          ...node,
          expandButtonClick: nodeExpandButtonClickHandler,
        };
      } else if (node.shape === 'label') {
        return {
          ...node,
          expandButtonClick: labelExpandButtonClickHandler,
        };
      }

      return { ...node };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);
};

/**
 * Graph visualization view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const GraphVisualization: React.FC = memo(() => {
  const dataView = useGetScopedSourcererDataView({
    sourcererScope: SourcererScopeName.default,
  });
  const [searchFilters, setSearchFilters] = useState<Filter[]>(() => []);
  const { getFieldsData, dataAsNestedObject } = useDocumentDetailsContext();
  const { eventIds, isAlert, timestamp } = useGraphPreview({
    getFieldsData,
    ecsData: dataAsNestedObject,
  });

  const { timeRange, setTimeRange } = useTimeRange(timestamp ?? new Date().toISOString());

  const {
    services: { uiSettings },
  } = useKibana();
  const [query, setQuery] = useState<{ bool: BoolQuery }>(
    buildEsQuery(
      dataView,
      [],
      isAlert
        ? [...searchFilters]
        : addFilter(dataView?.id ?? '', searchFilters, 'event.id', eventIds[0]),
      getEsQueryConfig(uiSettings as Parameters<typeof getEsQueryConfig>[0])
    )
  );

  useEffect(() => {
    setQuery(
      buildEsQuery(
        dataView,
        [],
        isAlert
          ? [...searchFilters]
          : addFilter(dataView?.id ?? '', searchFilters, 'event.id', eventIds[0]),
        getEsQueryConfig(uiSettings as Parameters<typeof getEsQueryConfig>[0])
      )
    );
  }, [searchFilters, dataView, uiSettings, isAlert, eventIds]);

  const { nodeExpandPopover, labelExpandPopover, popoverOpenWrapper } = useGraphPopovers(
    dataView?.id ?? '',
    setSearchFilters
  );
  const nodeExpandButtonClickHandler = (...args: unknown[]) =>
    popoverOpenWrapper(nodeExpandPopover.onNodeExpandButtonClick, ...args);
  const labelExpandButtonClickHandler = (...args: unknown[]) =>
    popoverOpenWrapper(labelExpandPopover.onLabelExpandButtonClick, ...args);
  const isPopoverOpen = [nodeExpandPopover].some(({ state: { isOpen } }) => isOpen);
  const { data, refresh, isFetching } = useGraphData(eventIds, isAlert, timeRange, query);
  const nodes = useGraphNodes(
    data?.nodes ?? [],
    nodeExpandButtonClickHandler,
    labelExpandButtonClickHandler
  );
  const parsedTimeRange: TimeRange = useMemo(() => {
    return {
      ...timeRange,
      from: dateMath.parse(timeRange.from),
      to: dateMath.parse(timeRange.to),
    };
  }, [timeRange]);

  return (
    <div data-test-subj={GRAPH_VISUALIZATION_TEST_ID}>
      {dataView && (
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
            dateRangeFrom: timeRange.from,
            dateRangeTo: timeRange.to,
            query: { query: '', language: 'kuery' },
            indexPatterns: [dataView],
            filters: searchFilters,
            submitButtonStyle: 'iconOnly',
            onFiltersUpdated: (newFilters) => {
              setSearchFilters(newFilters);
            },
            onQuerySubmit: (payload, isUpdate) => {
              if (isUpdate) {
                setTimeRange({ ...payload.dateRange });
              } else {
                refresh();
              }
            },
          }}
        />
      )}
      <InvestigateInTimelineButton
        asEmptyButton
        dataProviders={[]}
        filters={addFilter(dataView?.id ?? '', searchFilters, 'event.id', eventIds[0])}
        keepDataView
        iconType={'timeline'}
        timeRange={{ ...normalizeTimeRange(parsedTimeRange), kind: 'absolute' }}
      >
        <FormattedMessage
          id="xpack.securitySolution.flyout.documentDetails.left.graphVisualization.investigateInTimelineButtonLabel"
          defaultMessage="Investigate in Timeline"
        />
      </InvestigateInTimelineButton>
      <React.Suspense fallback={null}>
        <GraphLazy
          css={css`
            height: calc(100vh - 350px);
            min-height: 400px;
            width: 100%;
          `}
          nodes={nodes}
          edges={data?.edges ?? []}
          interactive={true}
          isLocked={isPopoverOpen}
        />
      </React.Suspense>
      <nodeExpandPopover.PopoverComponent />
      <labelExpandPopover.PopoverComponent />
    </div>
  );
});

GraphVisualization.displayName = 'GraphVisualization';
