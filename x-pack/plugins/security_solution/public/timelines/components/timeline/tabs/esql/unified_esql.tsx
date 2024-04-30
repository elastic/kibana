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
import { TimelineTabs } from '../../../../../../common/types';
import { useTextBasedEvents } from '../../../../../common/components/events_viewer/use_text_based_events';
import { useKibana } from '../../../../../common/lib/kibana';
import { UnifiedTimeline } from '../../unified_components';
import { defaultUdtHeaders } from '../../unified_components/default_headers';
import { ESQLTabHeader } from './header';

interface UnifiedEsqlProps {
  timelineId: string;
}

export const UnifiedEsql = (props: UnifiedEsqlProps) => {
  const { timelineId } = props;
  const inspectorAdapters = useRef({ requests: new RequestAdapter() });
  const [dataLoadingState, setDataLoadingState] = useState<DataLoadingState>(
    DataLoadingState.loaded
  );
  const [rows, setRows] = useState<DataTableRecord>([]);

  const [query, setQuery] = useState<AggregateQuery>({ esql: '' });

  const {
    services: { customDataService, expressions },
  } = useKibana();

  const { fetch } = useTextBasedEvents({
    query,
    dataView: null,
    data: customDataService,
    expressions,
    inspectorAdapters: inspectorAdapters.current,
  });

  const onQuerySubmit = useCallback(async () => {
    setDataLoadingState(DataLoadingState.loading);
    const result = await fetch();

    setRows(result.data);
    setDataLoadingState(DataLoadingState.loaded);
  }, [fetch]);

  const onQueryChange: SearchBarProps<AggregateQuery>['onQueryChange'] = useCallback((args) => {
    const { query: newQuery } = args;
    setQuery(newQuery);
  }, []);

  return (
    <div style={{ width: '100%' }}>
      <ESQLTabHeader
        onQuerySubmit={onQuerySubmit}
        onQueryChange={onQueryChange}
        onCancel={() => {}}
        isLoading={false}
        query={query}
        dateRangeFrom={'now-5d'}
        dateRangeTo={'now'}
      />

      <UnifiedTimeline
        columns={defaultUdtHeaders}
        rowRenderers={[]}
        isSortEnabled={true}
        timelineId={timelineId}
        itemsPerPage={100}
        itemsPerPageOptions={[10, 20, 50, 100]}
        sort={[]}
        events={rows}
        refetch={() => {}}
        dataLoadingState={dataLoadingState}
        totalCount={300}
        showExpandedDetails={false}
        onChangePage={() => {}}
        activeTab={TimelineTabs.esql}
        updatedAt={Date.now()}
        isTextBasedQuery={true}
      />
    </div>
  );
};

export default UnifiedEsql;
