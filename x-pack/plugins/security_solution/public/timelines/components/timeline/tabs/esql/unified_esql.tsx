/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { AggregateQuery } from '@kbn/es-query';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { DataLoadingState } from '@kbn/unified-data-table';
import type { SearchBarProps } from '@kbn/unified-search-plugin/public';
import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { ColumnHeaderOptions } from '@kbn/securitysolution-data-table/common/types';
import { useDispatch, useSelector } from 'react-redux';
import { isEmpty } from 'lodash';
import { useQuery } from '@tanstack/react-query';
import { EuiFlexGroup, EuiFlexItem, EuiTextColor } from '@elastic/eui';
import * as timelineActions from '../../../../store/actions';
import type { State, ESQLOptions } from '../../../../store/types';
import { useGetDataViewWithTextQuery } from '../../../../../common/containers/sourcerer/use_get_data_view_with_text_query';
import { useGetScopedSourcererDataView } from '../../../../../common/components/sourcerer/use_get_sourcerer_data_view';
import { TimelineTabs } from '../../../../../../common/types';
import { useTextBasedEvents } from '../../../../../common/components/events_viewer/use_text_based_events';
import { useKibana } from '../../../../../common/lib/kibana';
import { UnifiedTimeline } from '../../unified_components';
import { ESQLTabHeader } from './header';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import { defaultColumnHeaderType } from '../../unified_components/default_headers';
import {
  selectTimelineColumns,
  selectTimelineDateRange,
  selectTimelineESQLOptions,
} from '../../../../store/selectors';
import { useValidateTimelineESQLQuery } from './use_validate_timeline_esql_query';

interface UnifiedEsqlProps {
  timelineId: string;
}

export const UnifiedEsql = (props: UnifiedEsqlProps) => {
  const { timelineId } = props;
  const dispatch = useDispatch();
  const inspectorAdapters = useRef({ requests: new RequestAdapter() });
  const [dataLoadingState, setDataLoadingState] = useState<DataLoadingState>(
    DataLoadingState.loaded
  );

  useEffect(() => {
    return () => {
      console.log('unmounting');
    };
  }, []);

  const { query: esqlQuery, esqlDataViewId } = useSelector((state: State) =>
    selectTimelineESQLOptions(state, timelineId)
  );
  const { hasKeepClause, metaDataColumns } = useValidateTimelineESQLQuery(esqlQuery);
  const timelineDateRange = useSelector((state: State) =>
    selectTimelineDateRange(state, timelineId)
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

  const originalDataView = useGetScopedSourcererDataView({
    sourcererScope: SourcererScopeName.timeline,
  });

  const {
    services: { customDataService, expressions, dataViews },
  } = useKibana();

  const { data: esqlDataView } = useQuery<DataView | undefined>({
    queryKey: ['timeline', 'esql', 'dataView', esqlDataViewId],
    queryFn: () => {
      return esqlDataViewId ? dataViews.get(esqlDataViewId) : undefined;
    },
  });

  console.log({ esqlDataView, esqlDataViewId });

  const { getDataView, isLoading: isDataViewLoading } = useGetDataViewWithTextQuery({
    query: esqlQuery,
    dataViews,
    onSuccess: (dataView) => {
      updateESQLOptionsHandler({
        esqlDataViewId: dataView.id,
      });
    },
  });

  const { fetch } = useTextBasedEvents({
    query: esqlQuery,
    dataView: esqlDataView,
    data: customDataService,
    expressions,
    inspectorAdapters: inspectorAdapters.current,
  });

  const onFetch = useCallback(async () => {
    const result = await fetch();

    if (!hasKeepClause) {
      return {
        rows: result.data,
        cols: timelineColumns,
        warning: result.textBasedHeaderWarning,
      };
    }

    const newCols = (result.textBasedQueryColumns ?? []).map((localCols) => ({
      id: localCols.name,
      type: localCols.meta?.type ?? 'unknown',
      esTypes: localCols.meta?.esType ? [localCols.meta?.esType] : undefined,
      searchable: false,
      aggregatable: false,
      columnHeaderType: defaultColumnHeaderType,
    }));

    return {
      rows: result.data,
      cols: newCols,
    };

    // const columns = timelineColumns
    //   .map((timelineCol) => (timelineCol in columnMap ? columnMap.get(timelineCol) : undefined))
    //   .filter(Boolean) as ColumnHeaderOptions[];
    //
    //
  }, [fetch, hasKeepClause, timelineColumns]);

  const { refetch, data } = useQuery<{
    rows: DataTableRecord[];
    cols: ColumnHeaderOptions[];
    warnings: unknown;
  }>({
    queryKey: ['esql'],
    queryFn: onFetch,
    enabled: false,
    initialData: {
      rows: [],
      cols: [],
      warnings: [],
    },
  });

  console.log({ successData: data });

  const hasError = !metaDataColumns.includes('_id') || !metaDataColumns.includes('_index');

  console.log({ hasError });

  const onQuerySubmit = useCallback(async () => {
    setDataLoadingState(DataLoadingState.loading);
    await getDataView();
    await refetch();
    setDataLoadingState(DataLoadingState.loaded);
  }, [refetch, getDataView]);

  const onQueryChange: SearchBarProps<AggregateQuery>['onQueryChange'] = useCallback(
    (args) => {
      const {
        query: newQuery,
        dateRange: { from, to },
      } = args;

      updateESQLOptionsHandler({
        query: newQuery,
      });

      dispatch(
        timelineActions.updateRange({
          id: timelineId,
          start: from,
          end: to,
        })
      );
    },
    [timelineId, dispatch, updateESQLOptionsHandler]
  );

  if (!originalDataView) {
    return <div>{'Loading...'}</div>;
  }

  return (
    <div style={{ width: '100%' }}>
      <ESQLTabHeader
        onQuerySubmit={onQuerySubmit}
        onQueryChange={onQueryChange}
        onCancel={() => {}}
        isLoading={false}
        query={esqlQuery}
        dateRangeFrom={timelineDateRange.start}
        dateRangeTo={timelineDateRange.end}
        indexPatterns={[originalDataView]}
      />
      {hasError ? (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTextColor color="danger" size="s">
              <p>{`Metadata columns _id and _index must be included in form "from index metadata _id, _index | keep _id, _index" to enabled extra features. `}</p>
              <p> {JSON.stringify(data?.warnings ?? [])}</p>
            </EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
      {esqlDataView && !isEmpty(data.rows) ? (
        <UnifiedTimeline
          columns={data.cols}
          rowRenderers={[]}
          isSortEnabled={true}
          timelineId={timelineId}
          itemsPerPage={100}
          itemsPerPageOptions={[10, 20, 50, 100]}
          sort={[]}
          events={data.rows}
          refetch={refetch}
          dataLoadingState={dataLoadingState}
          totalCount={data.rows.length}
          showExpandedDetails={false}
          onChangePage={() => {}}
          activeTab={TimelineTabs.esql}
          updatedAt={Date.now()}
          isTextBasedQuery={true}
          dataView={esqlDataView}
        />
      ) : null}
    </div>
  );
};

export default UnifiedEsql;
