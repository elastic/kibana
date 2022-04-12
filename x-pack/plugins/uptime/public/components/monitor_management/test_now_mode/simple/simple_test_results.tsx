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
  onDone: () => void;
}
export function SimpleTestResults({ monitorId, onDone }: Props) {
  const [summaryDocs, setSummaryDocs] = useState<Ping[]>([]);
  const { summaryDoc, loading } = useSimpleRunOnceMonitors({ configId: monitorId });

  useEffect(() => {
    if (summaryDoc) {
      setSummaryDocs((prevState) => [summaryDoc, ...prevState]);
      onDone();
    }
  }, [summaryDoc, onDone]);

  return (
    <>
      <TestResultHeader summaryDocs={summaryDocs} isCompleted={Boolean(summaryDoc)} />
      {summaryDoc && <PingListTable pings={summaryDocs} loading={loading} />}
    </>
  );
}
