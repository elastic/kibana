/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { useSimpleRunOnceMonitors } from './use_simple_run_once_monitors';
import { Ping } from '../../../../../common/runtime_types';
import { PingListTable } from '../../../monitor/ping_list/ping_list_table';
import { TestResultHeader } from '../test_result_header';

interface Props {
  monitorId: string;
  expectPings: number;
  onDone: () => void;
}
export function SimpleTestResults({ monitorId, expectPings, onDone }: Props) {
  const [summaryDocsCache, setSummaryDocsCache] = useState<Ping[]>([]);
  const { summaryDocs, loading } = useSimpleRunOnceMonitors({
    configId: monitorId,
    expectSummaryDocs: expectPings,
  });

  useEffect(() => {
    if (summaryDocs) {
      setSummaryDocsCache((prevState: Ping[]) => {
        const prevById: Record<string, Ping> = prevState.reduce(
          (acc, cur) => ({ ...acc, [cur.docId]: cur }),
          {}
        );
        return summaryDocs.map((updatedDoc) => ({
          ...updatedDoc,
          ...(prevById[updatedDoc.docId] ?? {}),
        }));
      });

      if (summaryDocs.length >= expectPings) {
        onDone();
      }
    }
  }, [expectPings, summaryDocs, onDone]);

  return (
    <>
      <TestResultHeader
        summaryDocs={summaryDocsCache}
        isCompleted={Boolean(summaryDocs && summaryDocs.length >= expectPings)}
      />
      {summaryDocs && <PingListTable pings={summaryDocsCache} loading={loading} />}
    </>
  );
}
