/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { DataTableColumnsMeta } from '@kbn/unified-data-table';
import { DataLoadingState } from '@kbn/unified-data-table';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { isEmpty } from 'lodash';
import { InPortal } from 'react-reverse-portal';
import { useQuery } from '@tanstack/react-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiLoadingLogo } from '@elastic/eui';
import { getESQLHasKeepClause, getESQLSourceCommand } from '@kbn/securitysolution-utils';
import { noop } from 'lodash/fp';
import { selectTimelineDateRange } from '../../../../../common/store/inputs/selectors';
import { useEsqlEventsCountPortal } from '../../../../../common/hooks/use_timeline_events_count';
import { useGetAdHocDataViewWithESQLQuery } from '../../../../../sourcerer/containers/use_get_ad_hoc_data_view_with_esql_query';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { SourcererScopeName } from '../../../../../sourcerer/store/model';
import { useGetScopedSourcererDataView } from '../../../../../sourcerer/components/use_get_sourcerer_data_view';
import { useESQLBasedEvents } from '../../../../../common/containers/use_esql_based_query_events';
import * as timelineActions from '../../../../store/actions';
import type { ESQLOptions } from '../../../../store/types';
import type { State } from '../../../../../common/store/types';
import type { ColumnHeaderOptions } from '../../../../../../common/types';
import { TimelineTabs } from '../../../../../../common/types';
import { useKibana } from '../../../../../common/lib/kibana';
import { UnifiedTimeline } from '../../unified_components';
import type { ESQLHeaderOnQuerySubmit } from './header';
import { ESQLTabHeader } from './header';
import {
  defaultColumnHeaderType,
  defaultUdtHeaders,
} from '../../unified_components/default_headers';
import {
  selectTimelineESQLOptions,
  selectTimelinesItemPageOptions,
  selectTimelinesItemsPerPage,
} from '../../../../store/selectors';
import { EventsCountBadge } from '../shared/layout';

interface UnifiedEsqlProps {
  timelineId: string;
}

interface ESQLColumnsWithMeta {
  /*
   * Columns that are visible in the ESQL Data. This depends on the query. If user has `KEEP` clause then only
   * those columns are visible Otherwise, default set of columns defined by timelines are visible
   */
  visibleColumns: ColumnHeaderOptions[];
  /*
   * If user has custom columns or aggregations then we have to create dataView fields based on those columns.
   */
  dataViewFields?: DataViewField[];
  /*
   * Meta information about all the columns returned from ESQL query needed by unified data table
   */
  columnsMeta: DataTableColumnsMeta;
  /*
   * If the query has a timestamp column selected or not. This helps in rendering default sorting
   */
  hasTimestamp: boolean;
}

export const UnifiedEsql = (props: UnifiedEsqlProps) => {
  const { timelineId } = props;
  const dispatch = useDispatch();
  const { portalNode: esqlEventsCountPortalNode } = useEsqlEventsCountPortal();
  const inspectorAdapters = useRef({ requests: new RequestAdapter() });

  const augumentedColumnsRef = useRef<{
    visibleColumns: ColumnHeaderOptions[];
    dataViewFields?: DataViewField[];
    hasTimestamp: boolean;
    columnsMeta: DataTableColumnsMeta;
  } | null>(null);

  const {
    query: esqlQuery,
    esqlDataViewId,
    sort,
    visibleColumns: visibleESQLColumns,
  } = useSelector((state: State) => selectTimelineESQLOptions(state, timelineId));

  const timelineDateRange = useDeepEqualSelector(selectTimelineDateRange);

  const timelineItemsPerPage = useSelector((state: State) =>
    selectTimelinesItemsPerPage(state, timelineId)
  );

  const timelineItemPageOptions = useSelector((state: State) =>
    selectTimelinesItemPageOptions(state, timelineId)
  );

  const updateESQLOptionsHandler = useCallback(
    (esqlOptions: Partial<ESQLOptions>) => {
      dispatch(
        timelineActions.updateESQLOptions({
          id: timelineId,
          esqlOptions,
        })
      );
    },
    [dispatch, timelineId]
  );

  const securityDataView = useGetScopedSourcererDataView({
    sourcererScope: SourcererScopeName.timeline,
  });

  const {
    services: { expressions, dataViews },
  } = useKibana();

  const { data: esqlDataView } = useQuery<DataView | null>({
    queryKey: ['timeline', 'esql', 'dataView', esqlDataViewId ?? -1],
    queryFn: () => {
      return esqlDataViewId ? dataViews.get(esqlDataViewId) : null;
    },
  });

  const onAdHocDataViewSuccessCallback = useCallback(
    (dataView?: DataView) => {
      if (!dataView) return;
      updateESQLOptionsHandler({
        esqlDataViewId: dataView.id,
      });
    },
    [updateESQLOptionsHandler]
  );

  const {
    data,
    refetch,
    isLoading: isEventFetchInProgress,
    dataUpdatedAt,
  } = useESQLBasedEvents({
    query: esqlQuery,
    dataView: esqlDataView ?? undefined,
    expressions,
    inspectorAdapters: inspectorAdapters.current,
    timeRange: {
      from: timelineDateRange.from,
      to: timelineDateRange.to,
    },
  });

  const { getDataView, isLoading: isDataViewLoading } = useGetAdHocDataViewWithESQLQuery({
    dataViews,
    onDataViewCreationSuccess: onAdHocDataViewSuccessCallback,
  });

  const esqlColumnsWithMeta: ESQLColumnsWithMeta = useMemo(() => {
    // Only calculate the columns if the data is completely loaded
    if (augumentedColumnsRef.current && (isEventFetchInProgress || isDataViewLoading)) {
      return augumentedColumnsRef.current;
    }

    const visibleCols: ColumnHeaderOptions[] = [];
    const resultDataViewFiels: DataViewField[] = [];
    let allColumnsMeta: DataTableColumnsMeta = {};

    let hasTimestamp = false;

    for (const currentColumn of data.columns) {
      if (!allColumnsMeta) {
        allColumnsMeta = {};
      }

      allColumnsMeta[currentColumn.name] = {
        type: currentColumn.meta?.type ?? 'unknown',
        esType: currentColumn.meta?.esType ? currentColumn.meta?.esType : undefined,
      };

      if (currentColumn.name === '@timestamp') {
        hasTimestamp = true;
      }

      const isFromCommand = getESQLSourceCommand(esqlQuery.esql) === 'from';
      const hasKeepClause = getESQLHasKeepClause(esqlQuery.esql);

      if (!isFromCommand || hasKeepClause) {
        /*
         * If the query has a KEEP clause or is not FROM command,
         * it means there are particular columns that user wants to see
         */
        const newCol = {
          id: currentColumn.name,
          type: currentColumn.meta?.type ?? 'unknown',
          esTypes: currentColumn.meta?.esType ? [currentColumn.meta?.esType] : undefined,
          searchable: false,
          aggregatable: false,
          columnHeaderType: defaultColumnHeaderType,
        };
        visibleCols.push(newCol);

        const newField = new DataViewField({
          name: currentColumn.name,
          type: currentColumn.meta?.type ?? 'unknown',
          esTypes: currentColumn.meta?.esType ? [currentColumn.meta?.esType] : undefined,
          searchable: false,
          aggregatable: false,
        });

        resultDataViewFiels.push(newField);
      }
    }

    const result = {
      visibleColumns: visibleCols,
      dataViewFields: resultDataViewFiels.length > 0 ? resultDataViewFiels : undefined,
      hasTimestamp,
      columnsMeta: allColumnsMeta,
    };

    augumentedColumnsRef.current = result;
    return result;
  }, [data.columns, esqlQuery, isEventFetchInProgress, isDataViewLoading]);

  useEffect(() => {
    /*
     *
     * Bring ESQL visible columns in table upto date according to
     * the columns fetched from the ESQL query
     *
     * */
    if (esqlColumnsWithMeta.visibleColumns.length > 0) {
      updateESQLOptionsHandler({
        visibleColumns: esqlColumnsWithMeta.visibleColumns,
      });
      return;
    }

    /*
     *
     * if no columns are specified by the user, we show the default columns
     *
     */
    updateESQLOptionsHandler({
      visibleColumns: defaultUdtHeaders,
    });
  }, [esqlColumnsWithMeta.visibleColumns, updateESQLOptionsHandler]);

  const onQuerySubmit: ESQLHeaderOnQuerySubmit = useCallback(
    async ({ query }) => {
      await getDataView(query);
    },
    [getDataView]
  );

  const dataLoadingState = useMemo(
    () =>
      isEventFetchInProgress || isDataViewLoading
        ? DataLoadingState.loading
        : DataLoadingState.loaded,
    [isEventFetchInProgress, isDataViewLoading]
  );

  const rowRenderersMemo = useMemo(() => [], []);

  const esqlSort = useMemo(() => {
    return sort.filter(({ columnId }) => columnId in esqlColumnsWithMeta.columnsMeta);
  }, [esqlColumnsWithMeta, sort]);

  const onSort = useCallback(
    (newSort: string[][]) => {
      updateESQLOptionsHandler({
        sort: newSort.map(([field, direction]) => ({
          columnId: field,
          columnType: esqlColumnsWithMeta.columnsMeta[field]?.type ?? 'unknown',
          sortDirection: direction as 'asc' | 'desc',
        })),
      });
    },
    [updateESQLOptionsHandler, esqlColumnsWithMeta.columnsMeta]
  );

  const onVisibleColumnsChange = useCallback(
    (newColumns: ColumnHeaderOptions[]) => {
      updateESQLOptionsHandler({
        visibleColumns: newColumns,
      });
    },
    [updateESQLOptionsHandler]
  );

  const totalCount = useMemo(() => data.rows.length, [data.rows.length]);

  if (!securityDataView) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingLogo logo="logoElastic" size="xl" />}
        title={<h2>{'Loading Dataview'}</h2>}
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <InPortal node={esqlEventsCountPortalNode}>
        {totalCount >= 0 ? <EventsCountBadge>{totalCount}</EventsCountBadge> : null}
      </InPortal>
      <EuiFlexItem grow={false}>
        <ESQLTabHeader
          onQuerySubmit={onQuerySubmit}
          indexPatterns={[securityDataView]}
          timelineId={timelineId}
        />
      </EuiFlexItem>
      {visibleESQLColumns && 'rows' in data && !isEmpty(data.rows) ? (
        <EuiFlexItem grow={true}>
          <UnifiedTimeline
            columns={visibleESQLColumns}
            rowRenderers={rowRenderersMemo}
            isSortEnabled={true}
            timelineId={timelineId}
            itemsPerPage={timelineItemsPerPage}
            itemsPerPageOptions={timelineItemPageOptions}
            sort={esqlSort}
            events={data.rows}
            refetch={refetch}
            onSort={onSort}
            dataLoadingState={dataLoadingState}
            totalCount={totalCount}
            activeTab={TimelineTabs.esql}
            isTextBasedQuery={true}
            dataView={esqlDataView ?? securityDataView}
            textBasedDataViewFields={esqlColumnsWithMeta.dataViewFields}
            columnsMeta={esqlColumnsWithMeta.columnsMeta}
            onChangePage={noop}
            updatedAt={dataUpdatedAt}
            onVisibleColumnsChange={onVisibleColumnsChange}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default UnifiedEsql;
