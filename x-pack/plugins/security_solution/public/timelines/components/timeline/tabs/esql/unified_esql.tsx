/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { DataTableColumnsMeta } from '@kbn/unified-data-table';
import { DataLoadingState } from '@kbn/unified-data-table';
import React, { useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { isEmpty } from 'lodash';
import { useQuery } from '@tanstack/react-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiLoadingLogo } from '@elastic/eui';
import {
  getESQLHasKeepClause,
  getESQLSourceCommand,
  parseESQLQuery,
} from '../../../../../common/hooks/esql/use_validate_timeline_esql_query';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import { useGetScopedSourcererDataView } from '../../../../../common/components/sourcerer/use_get_sourcerer_data_view';
import { useTextBasedEvents } from '../../../../../common/containers/use_text_based_query_events';
import * as timelineActions from '../../../../store/actions';
import type { ESQLOptions } from '../../../../store/types';
import type { State } from '../../../../../common/store/types';
import { useGetAdHocDataViewWithTextQuery } from '../../../../../common/containers/sourcerer/use_get_data_view_with_text_query';
import type { ColumnHeaderOptions } from '../../../../../../common/types';
import { TimelineTabs } from '../../../../../../common/types';
import { useKibana } from '../../../../../common/lib/kibana';
import { UnifiedTimeline } from '../../unified_components';
import type { ESQLTabHeaderProps } from './header';
import { ESQLTabHeader } from './header';
import { defaultColumnHeaderType } from '../../unified_components/default_headers';
import {
  selectTimelineColumns,
  selectTimelineDateRange,
  selectTimelineESQLOptions,
  selectTimelinesItemPageOptions,
  selectTimelinesItemsPerPage,
} from '../../../../store/selectors';

interface UnifiedEsqlProps {
  timelineId: string;
}

export const UnifiedEsql = (props: UnifiedEsqlProps) => {
  const { timelineId } = props;
  const dispatch = useDispatch();

  const inspectorAdapters = useRef({ requests: new RequestAdapter() });

  const augumentedColumnsRef = useRef<{
    columns: ColumnHeaderOptions[];
    dataViewFields?: DataViewField[];
    hasTimestamp: boolean;
    columnsMeta: DataTableColumnsMeta;
  } | null>(null);

  const {
    query: esqlQuery,
    esqlDataViewId,
    sort,
  } = useSelector((state: State) => selectTimelineESQLOptions(state, timelineId));

  const timelineDateRange = useDeepEqualSelector((state: State) =>
    selectTimelineDateRange(state, timelineId)
  );

  const timelineItemsPerPage = useSelector((state: State) =>
    selectTimelinesItemsPerPage(state, timelineId)
  );

  const timelineItemPageOptions = useSelector((state: State) =>
    selectTimelinesItemPageOptions(state, timelineId)
  );

  const timelineColumns = useSelector((state: State) => selectTimelineColumns(state, timelineId));

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
    services: { customDataService, expressions, dataViews },
  } = useKibana();

  const { data: esqlDataView } = useQuery<DataView | undefined>({
    queryKey: ['timeline', 'esql', 'dataView', esqlDataViewId ?? -1],
    queryFn: () => {
      return esqlDataViewId ? dataViews.get(esqlDataViewId) : undefined;
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
  } = useTextBasedEvents({
    query: esqlQuery,
    dataView: esqlDataView,
    expressions,
    inspectorAdapters: inspectorAdapters.current,
    timeRange: {
      from: timelineDateRange.start,
      to: timelineDateRange.end,
    },
  });

  const { getDataView, isLoading: isDataViewLoading } = useGetAdHocDataViewWithTextQuery({
    query: esqlQuery,
    dataViews,
    onDataViewCreationSuccess: onAdHocDataViewSuccessCallback,
  });

  /*
   *
   * getAugumentedColumns loops over all the columns and tries to extract all the
   * information it needs to render the ESQL Data properly.
   *
   * */
  const augumentedColumns = useMemo(() => {
    if (augumentedColumnsRef.current && (isEventFetchInProgress || isDataViewLoading)) {
      return augumentedColumnsRef.current;
    }

    const resultCols: ColumnHeaderOptions[] = [];
    const resultDataViewFiels: DataViewField[] = [];
    let columnsMeta: DataTableColumnsMeta = {};

    let hasTimestamp = false;

    for (const currentColumn of data.columns) {
      if (!columnsMeta) {
        columnsMeta = {};
      }

      columnsMeta[currentColumn.name] = {
        type: currentColumn.meta?.type ?? 'unknown',
        esType: currentColumn.meta?.esType ? currentColumn.meta?.esType : undefined,
      };

      if (currentColumn.name === '@timestamp') {
        hasTimestamp = true;
      }

      const queryAst = parseESQLQuery(esqlQuery).ast;
      const isFromCommand = getESQLSourceCommand(queryAst) === 'from';
      const hasKeepClause = getESQLHasKeepClause(queryAst);

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
        resultCols.push(newCol);

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
      columns: resultCols.length > 0 ? resultCols : timelineColumns,
      dataViewFields: resultDataViewFiels.length > 0 ? resultDataViewFiels : undefined,
      hasTimestamp,
      columnsMeta,
    };

    augumentedColumnsRef.current = result;
    return result;
  }, [timelineColumns, data.columns, esqlQuery, isEventFetchInProgress, isDataViewLoading]);

  const onQuerySubmit: ESQLTabHeaderProps['onQuerySubmit'] = useCallback(async () => {
    await getDataView();
  }, [getDataView]);

  const dataLoadingState = useMemo(
    () =>
      isEventFetchInProgress || isDataViewLoading
        ? DataLoadingState.loading
        : DataLoadingState.loaded,
    [isEventFetchInProgress, isDataViewLoading]
  );

  const rowRenderersMemo = useMemo(() => [], []);

  const esqlSort = useMemo(() => {
    return sort.filter(({ columnId }) => columnId in augumentedColumns.columnsMeta);
  }, [augumentedColumns, sort]);

  const onSort = useCallback(
    (newSort: string[][]) => {
      updateESQLOptionsHandler({
        sort: newSort.map(([field, direction]) => ({
          columnId: field,
          columnType: augumentedColumns.columnsMeta[field]?.type ?? 'unknown',
          sortDirection: direction as 'asc' | 'desc',
        })),
      });
    },
    [updateESQLOptionsHandler, augumentedColumns.columnsMeta]
  );

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
      <EuiFlexItem grow={false}>
        <ESQLTabHeader
          onQuerySubmit={onQuerySubmit}
          indexPatterns={[securityDataView]}
          timelineId={timelineId}
        />
      </EuiFlexItem>
      {'data' in data && !isEmpty(data.data) ? (
        <EuiFlexItem grow={true}>
          <UnifiedTimeline
            columns={augumentedColumns.columns}
            rowRenderers={rowRenderersMemo}
            isSortEnabled={true}
            timelineId={timelineId}
            itemsPerPage={timelineItemsPerPage}
            itemsPerPageOptions={timelineItemPageOptions}
            sort={esqlSort}
            events={data.data}
            refetch={refetch}
            onSort={onSort}
            dataLoadingState={dataLoadingState}
            totalCount={data.data.length}
            showExpandedDetails={false}
            activeTab={TimelineTabs.esql}
            isTextBasedQuery={true}
            dataView={esqlDataView ?? securityDataView}
            textBasedDataViewFields={augumentedColumns.dataViewFields}
            columnsMeta={augumentedColumns.columnsMeta}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default UnifiedEsql;
