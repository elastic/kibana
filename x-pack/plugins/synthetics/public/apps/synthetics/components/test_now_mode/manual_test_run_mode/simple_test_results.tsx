/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { useSimpleRunOnceMonitors } from '../hooks/use_simple_run_once_monitors';

interface Props {
  testRunId: string;
  expectPings: number;
  onDone: (testRunId: string) => void;
}
export function SimpleTestResults({ testRunId, expectPings, onDone }: Props) {
  const { summaryDocs } = useSimpleRunOnceMonitors({
    testRunId,
    expectSummaryDocs: expectPings,
  });

  useEffect(() => {
    if (summaryDocs) {
      if (summaryDocs.length >= expectPings) {
        onDone(testRunId);
      }
    }
  }, [testRunId, expectPings, summaryDocs, onDone]);

  return <></>;
}
