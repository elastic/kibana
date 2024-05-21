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
} from '../../../../store/selectors';

interface UnifiedEsqlProps {
  timelineId: string;
}

export const UnifiedEsql = (props: UnifiedEsqlProps) => {
  const { timelineId } = props;
  const dispatch = useDispatch();

  const inspectorAdapters = useRef({ requests: new RequestAdapter() });

  const {
    query: esqlQuery,
    esqlDataViewId,
    queryValidation: { hasKeepClause = false, sourceCommand },
    sort,
  } = useSelector((state: State) => selectTimelineESQLOptions(state, timelineId));

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

  const securityDataView = useGetScopedSourcererDataView({
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
    refetch,
    data,
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

  const getAugumentedColumns = useCallback(() => {
    const resultCols: ColumnHeaderOptions[] = [];
    const resultDataViewFiels: DataViewField[] = [];
    let columnsMeta: DataTableColumnsMeta | undefined;

    let hasTimeStamp = false;

    const isFromCommand = sourceCommand === 'from';

    for (const currentColumn of data.columns) {
      if (!columnsMeta) {
        columnsMeta = {};
      }

      columnsMeta[currentColumn.name] = {
        type: currentColumn.meta?.type ?? 'unknown',
        esType: currentColumn.meta?.esType ? currentColumn.meta?.esType : undefined,
      };

      if (currentColumn.name === '@timestamp') {
        hasTimeStamp = true;
      }

      if (hasKeepClause || !isFromCommand) {
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

    return {
      columns: resultCols.length > 0 ? resultCols : timelineColumns,
      dataViewFields: resultDataViewFiels.length > 0 ? resultDataViewFiels : undefined,
      hasTimeStamp,
      columnsMeta,
    };
  }, [hasKeepClause, timelineColumns, data.columns, sourceCommand]);

  const augumentedColumns = useMemo(() => {
    return getAugumentedColumns();
  }, [getAugumentedColumns]);

  const onQuerySubmit: ESQLTabHeaderProps['onQuerySubmit'] = useCallback(
    async ({ queryValidationResult }) => {
      await getDataView();
      await refetch();
      updateESQLOptionsHandler({
        queryValidation: {
          hasKeepClause: queryValidationResult.hasKeepClause,
          sourceCommand: queryValidationResult.command,
        },
      });
    },
    [refetch, getDataView, updateESQLOptionsHandler]
  );

  const onQueryChange: ESQLTabHeaderProps['onQueryChange'] = useCallback(
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

  const dataLoadingState = useMemo(
    () =>
      isEventFetchInProgress || isDataViewLoading
        ? DataLoadingState.loading
        : DataLoadingState.loaded,
    [isEventFetchInProgress, isDataViewLoading]
  );

  const esqlSort = useMemo(() => {
    return augumentedColumns.hasTimeStamp ? sort : [];
  }, [augumentedColumns.hasTimeStamp, sort]);

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
          onQueryChange={onQueryChange}
          query={esqlQuery}
          dateRangeFrom={timelineDateRange.start}
          dateRangeTo={timelineDateRange.end}
          indexPatterns={[securityDataView]}
        />
      </EuiFlexItem>
      {!isEmpty(data.data) ? (
        <EuiFlexItem grow={true}>
          <UnifiedTimeline
            columns={augumentedColumns.columns}
            rowRenderers={[]}
            isSortEnabled={true}
            timelineId={timelineId}
            itemsPerPage={100}
            itemsPerPageOptions={[10, 20, 50, 100]}
            sort={esqlSort}
            events={data.data}
            refetch={refetch}
            dataLoadingState={dataLoadingState}
            totalCount={data.data.length}
            showExpandedDetails={false}
            onChangePage={() => {}}
            activeTab={TimelineTabs.esql}
            updatedAt={Date.now()}
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
