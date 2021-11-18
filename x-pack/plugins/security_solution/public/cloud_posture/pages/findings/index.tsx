/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { Filter, Query } from '@kbn/es-query';
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import {
  DataView,
  TimeRange,
  SearchSourceFields,
} from '../../../../../../../src/plugins/data/common';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { HeaderPage } from '../../../common/components/header_page';
import { FindingsTable } from './findings_table';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { CloudPosturePage } from '../../../app/types';
import { useKibana } from '../../../common/lib/kibana';

// import { SearchBar } from '../../../../../../../src/plugins/data/public';
// import { useCloudPostureFindingsApi } from '../../common/api';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

// TODO:
// 1 - preserve state from URL

export const Findings = () => (
  <SecuritySolutionPageWrapper noPadding={false} data-test-subj="csp_rules">
    <HeaderPage hideSourcerer border title={'Findings'} />
    <FindingsTableContainer />
    <SpyRoute pageName={CloudPosturePage.findings} />
  </SecuritySolutionPageWrapper>
);

const getAgentLogsEsQuery = (): SearchSourceFields => ({
  size: 0,
  query: {
    // TODO: types are wrong? query fails when they are 'correct'
    bool: {
      filter: [
        { term: { 'event_status.keyword': 'end' } },
        { term: { 'compliance.keyword': 'k8s cis' } },
      ],
    },
  },
  aggs: {
    group: {
      terms: { field: 'agent.keyword' },
      aggs: {
        group_docs: {
          top_hits: {
            size: 1,
            sort: [{ timestamp: { order: 'desc' } }],
          },
        },
      },
    },
  },
  fields: ['run_id.keyword', 'agent.keyword'],
});

const FindingsTableContainer = () => {
  const { data: dataService } = useKibana().services;
  const [filters, setFilters] = useState<Filter[]>([]);
  const [nextQuery, setQuery] = useState<{ dateRange?: TimeRange; query?: Query }>({
    query: { language: 'kuery', query: '' },
  });
  const [findings, setFindings] = useState<Array<SearchHit<unknown>>>();
  const [views, setDataViews] = useState<[DataView, DataView]>();
  const {
    ui: { SearchBar },
    dataViews,
    query,
    search,
  } = dataService;

  const findingsDataView = views?.[1];

  useEffect(() => {
    if (!dataViews) return;
    async function getDataViews() {
      // const dataView = (await dataViews.find('agent_log_2'))?.[0];
      const dataViewLogs = (await dataViews.find('agent_logs'))?.[0];
      const dataViewFindings = (await dataViews.find('findings2'))?.[0];
      setDataViews([dataViewLogs, dataViewFindings]);
    }
    getDataViews();
  }, [dataViews]);

  const runSearch = useCallback(async () => {
    if (!views) return;
    const [dataView, dataViewFindings] = views;

    if (nextQuery) query.queryString.setQuery(nextQuery.query!);
    const nextFilters = [...filters];

    const timefilter = query.timefilter.timefilter.createFilter(
      dataViewFindings,
      nextQuery.dateRange
    );
    if (timefilter) {
      nextFilters.push(timefilter);
    }

    query.filterManager.setFilters(nextFilters);

    const agentLogs = await search.searchSource.create({
      ...getAgentLogsEsQuery(),
      index: dataView,
    });

    const agentLogsResponse = await agentLogs.fetch$().toPromise();

    const aggregations = agentLogsResponse.rawResponse.aggregations;
    if (!aggregations) {
      throw new Error('missing aggregations in agent logs');
    }

    const buckets = (aggregations.group as any).buckets;

    if (!Array.isArray(buckets)) {
      throw new Error('missing buckets in agent logs');
    }

    const findingsSearch = await search.searchSource.create({
      filter: query.filterManager.getFilters(),
      query: query.queryString.getQuery(),
      index: dataViewFindings,
      size: 1000,
    });

    const findingsResponse = await findingsSearch.fetch$().toPromise();

    console.log('new search', { filters, query, findingsResponse });
    setFindings(findingsResponse.rawResponse.hits.hits.map((v) => ({ ...v, ...v._source })));
  }, [views, nextQuery, query, filters, search.searchSource]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  if (!findingsDataView || !findings) return null;

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <SearchBar
        appName="foo"
        indexPatterns={[findingsDataView]}
        onFiltersUpdated={setFilters}
        onQuerySubmit={setQuery}
        showFilterBar={true}
        showDatePicker={true}
        showQueryBar={true}
        showQueryInput={true}
        showSaveQuery={true}
      />
      <EuiSpacer />
      <FindingsTable data={findings} />
    </div>
  );
};
