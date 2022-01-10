/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useSimpleRunOnceMonitors } from './use_simple_run_once_monitors';
import { Ping } from '../../../../../common/runtime_types';
import { PingListTable } from '../../../monitor/ping_list/ping_list_table';
import { TestResultHeader } from '../test_result_header';

interface Props {
  monitorId: string;
  monitorType: string;
  index: number;
  device: string;
  refresh: number;
  setRefresh: Dispatch<SetStateAction<number>>;
}
export function SimpleTestResults({
  monitorId,
  refresh,
  setRefresh,
  index,
  device,
  monitorType,
}: Props) {
  const [summaryDocs, setSummaryDocs] = useState<Ping[]>([]);
  const { summaryDoc, loading } = useSimpleRunOnceMonitors({ monitorId, refresh, setRefresh });

  useEffect(() => {
    if (summaryDoc) {
      setSummaryDocs((prevState) => [summaryDoc, ...prevState]);
    }
  }, [summaryDoc]);

  return (
    <>
      <TestResultHeader
        summaryDoc={summaryDoc}
        index={index}
        device={device}
        monitorType={monitorType}
      />
      {summaryDoc && <PingListTable pings={summaryDocs} loading={loading} />}
    </>
  );
}
