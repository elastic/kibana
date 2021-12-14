/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { REPORTING_TRANSACTION_TYPE } from '../../../../common/constants';

interface PdfTracker {
  setByteLength: (byteLength: number) => void;
  setCpuUsage: (cpu: number) => void;
  setMemoryUsage: (memory: number) => void;
  startScreenshots: () => void;
  endScreenshots: () => void;
  startSetup: () => void;
  endSetup: () => void;
  startAddImage: () => void;
  endAddImage: () => void;
  startCompile: () => void;
  endCompile: () => void;
  startGetBuffer: () => void;
  endGetBuffer: () => void;
  end: () => void;
}

const SPANTYPE_SETUP = 'setup';
const SPANTYPE_OUTPUT = 'output';

interface ApmSpan {
  end: () => void;
}

export function getTracker(): PdfTracker {
  const apmTrans = apm.startTransaction('generate-pdf', REPORTING_TRANSACTION_TYPE);

  let apmScreenshots: ApmSpan | null = null;
  let apmSetup: ApmSpan | null = null;
  let apmAddImage: ApmSpan | null = null;
  let apmCompilePdf: ApmSpan | null = null;
  let apmGetBuffer: ApmSpan | null = null;

  return {
    startScreenshots() {
      apmScreenshots = apmTrans?.startSpan('screenshots-pipeline', SPANTYPE_SETUP) || null;
    },
    endScreenshots() {
      if (apmScreenshots) apmScreenshots.end();
    },
    startSetup() {
      apmSetup = apmTrans?.startSpan('setup-pdf', SPANTYPE_SETUP) || null;
    },
    endSetup() {
      if (apmSetup) apmSetup.end();
    },
    startAddImage() {
      apmAddImage = apmTrans?.startSpan('add-pdf-image', SPANTYPE_OUTPUT) || null;
    },
    endAddImage() {
      if (apmAddImage) apmAddImage.end();
    },
    startCompile() {
      apmCompilePdf = apmTrans?.startSpan('compile-pdf', SPANTYPE_OUTPUT) || null;
    },
    endCompile() {
      if (apmCompilePdf) apmCompilePdf.end();
    },
    startGetBuffer() {
      apmGetBuffer = apmTrans?.startSpan('get-buffer', SPANTYPE_OUTPUT) || null;
    },
    endGetBuffer() {
      if (apmGetBuffer) apmGetBuffer.end();
    },
    setByteLength(byteLength: number) {
      apmTrans?.setLabel('byte-length', byteLength, false);
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
