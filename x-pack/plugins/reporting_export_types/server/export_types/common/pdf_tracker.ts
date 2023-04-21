/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';

interface PdfTracker {
  setCpuUsage: (cpu: number) => void;
  setMemoryUsage: (memory: number) => void;
  startScreenshots: () => void;
  endScreenshots: () => void;
  end: () => void;
}

const TRANSACTION_TYPE = 'reporting';
const SPANTYPE_SETUP = 'setup';

interface ApmSpan {
  end: () => void;
}

export function getTracker(): PdfTracker {
  const apmTrans = apm.startTransaction('generate-pdf', TRANSACTION_TYPE);

  let apmScreenshots: ApmSpan | null = null;

  return {
    startScreenshots() {
      apmScreenshots = apmTrans?.startSpan('screenshots-pipeline', SPANTYPE_SETUP) || null;
    },
    endScreenshots() {
      if (apmScreenshots) apmScreenshots.end();
    },
    setCpuUsage(cpu: number) {
      apmTrans?.setLabel('cpu', cpu, false);
    },
    setMemoryUsage(memory: number) {
      apmTrans?.setLabel('memory', memory, false);
    },
    end() {
      if (apmTrans) apmTrans.end();
    },
  };
}
