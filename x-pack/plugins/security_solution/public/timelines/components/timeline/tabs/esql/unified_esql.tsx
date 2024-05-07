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
import React, { useCallback, useRef, useState } from 'react';
import type { ColumnHeaderOptions } from '@kbn/securitysolution-data-table/common/types';
import { useDispatch, useSelector } from 'react-redux';
import { isEmpty } from 'lodash';
import { EuiEmptyPrompt } from '@elastic/eui';
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
import { selectTimelineDateRange, selectTimelineESQLQuery } from '../../../../store/selectors';

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

  const esqlQuery = useSelector((state: State) => selectTimelineESQLQuery(state, timelineId));
  const timelineDateRange = useSelector((state: State) =>
    selectTimelineDateRange(state, timelineId)
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

  const [rows, setRows] = useState<DataTableRecord[]>([]);
  const [cols, setColumns] = useState<ColumnHeaderOptions[]>([]);

  const originalDataView = useGetScopedSourcererDataView({
    sourcererScope: SourcererScopeName.timeline,
  });

  const {
    services: { customDataService, expressions, dataViews },
  } = useKibana();

  const {
    dataView: textBasedDataView,
    getDataView,
    isLoading: isDataViewLoading,
  } = useGetDataViewWithTextQuery({
    query: esqlQuery,
    dataViews,
  });

  const { fetch } = useTextBasedEvents({
    query: esqlQuery,
    dataView: textBasedDataView,
    data: customDataService,
    expressions,
    inspectorAdapters: inspectorAdapters.current,
  });

  const onQuerySubmit = useCallback(async () => {
    setDataLoadingState(DataLoadingState.loading);
    const result = await fetch();

    const columns = (result.textBasedQueryColumns ?? []).map((column) => ({
      id: column.name,
      type: column.meta?.type ?? 'unknown',
      esTypes: column.meta?.esType ? [column.meta?.esType] : undefined,
      searchable: false,
      aggregatable: false,
      columnHeaderType: defaultColumnHeaderType,
    }));

    setRows(result.data);

    setColumns(columns);

    setDataLoadingState(DataLoadingState.loaded);
    await getDataView();
  }, [fetch, getDataView]);

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
      {textBasedDataView && !isEmpty(rows) ? (
        <UnifiedTimeline
          columns={cols}
          rowRenderers={[]}
          isSortEnabled={true}
          timelineId={timelineId}
          itemsPerPage={100}
          itemsPerPageOptions={[10, 20, 50, 100]}
          sort={[]}
          events={rows}
          refetch={() => {}}
          dataLoadingState={dataLoadingState}
          totalCount={rows.length}
          showExpandedDetails={false}
          onChangePage={() => {}}
          activeTab={TimelineTabs.esql}
          updatedAt={Date.now()}
          isTextBasedQuery={true}
          dataView={textBasedDataView}
        />
      ) : (
        <EuiEmptyPrompt title={<span>{'Nothing to Show'}</span>}>{'Nothing'}</EuiEmptyPrompt>
      )}
    </div>
  );
};

export default UnifiedEsql;
