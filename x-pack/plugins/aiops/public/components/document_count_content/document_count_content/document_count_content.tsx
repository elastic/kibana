/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// @ts-nocheck // remove
import React, { FC, useState, useEffect, useCallback } from 'react'; // useMemo useCallback
import { lastValueFrom } from 'rxjs';
import { useAiOpsKibana } from '../../../kibana_context';
import { DocumentCountChart, DocumentCountChartPoint } from '../document_count_chart';
import { TotalCountHeader } from '../total_count_header';
import {
  DocumentCountStats,
  getDocumentCountStatsRequest,
  processDocumentCountStats,
  OverallStatsSearchStrategyParams,
} from '../../../get_document_stats';

export const DocumentCountContent: FC<{
  searchParams: OverallStatsSearchStrategyParams;
}> = ({ searchParams }) => {
  const [documentCountStats, setDocumentCountStats] = useState<DocumentCountStats>();
  const [totalCount, setTotalCount] = useState<number>(0);
  const {
    services: {
      data,
      // notifications: { toasts },
    },
  } = useAiOpsKibana();

  const fetchDocumentCountData = useCallback(async () => {
    const params = getDocumentCountStatsRequest(searchParams);
    try {
      const resp: any = await lastValueFrom(
        data.search.search({
          params: getDocumentCountStatsRequest(searchParams).body,
        })
      );
      const stats = processDocumentCountStats(resp?.rawResponse, searchParams);

      setDocumentCountStats(stats);
      setTotalCount(stats?.totalCount ?? 0);
    } catch (e) {
      // eslint-disable-next-line
      console.log('---- ERROR FETCHING COUNT DATA ------', e); // remove
    }
  }, [data?.search, searchParams]);

  useEffect(
    function getDocumentCountData() {
      fetchDocumentCountData();
    },
    [fetchDocumentCountData]
  );

  if (documentCountStats === undefined) {
    return totalCount !== undefined ? <TotalCountHeader totalCount={totalCount} /> : null;
  }

  const { timeRangeEarliest, timeRangeLatest } = documentCountStats;
  if (timeRangeEarliest === undefined || timeRangeLatest === undefined)
    return <TotalCountHeader totalCount={totalCount} />;

  let chartPoints: DocumentCountChartPoint[] = [];
  if (documentCountStats.buckets !== undefined) {
    const buckets: Record<string, number> = documentCountStats?.buckets;
    chartPoints = Object.entries(buckets).map(([time, value]) => ({ time: +time, value }));
  }

  return (
    <>
      <TotalCountHeader totalCount={totalCount} />
      <DocumentCountChart
        chartPoints={chartPoints}
        timeRangeEarliest={timeRangeEarliest}
        timeRangeLatest={timeRangeLatest}
        interval={documentCountStats.interval}
      />
    </>
  );
};
