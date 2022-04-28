/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';

interface PdfTracker {
  setByteLength: (byteLength: number) => void;
  startAddImage: () => void;
  endAddImage: () => void;
  startCompile: () => void;
  endCompile: () => void;
  end: () => void;
}

const TRANSACTION_TYPE = 'reporting'; // TODO: Find out whether we can rename to "screenshotting";
const SPANTYPE_OUTPUT = 'output';

interface ApmSpan {
  end: () => void;
}

export function getTracker(): PdfTracker {
  const apmTrans = apm.startTransaction('generate-pdf', TRANSACTION_TYPE);

  let apmAddImage: ApmSpan | null = null;
  let apmCompilePdf: ApmSpan | null = null;

  return {
    startAddImage() {
      apmAddImage = apmTrans?.startSpan('add-pdf-image', SPANTYPE_OUTPUT) || null;
    },
    endAddImage() {
      apmAddImage?.end();
    },
    startCompile() {
      apmCompilePdf = apmTrans?.startSpan('compile-pdf', SPANTYPE_OUTPUT) || null;
    },
    endCompile() {
      apmCompilePdf?.end();
    },
    setByteLength(byteLength: number) {
      apmTrans?.setLabel('byte-length', byteLength, false);
    },
    end() {
      apmTrans?.end();
    },
  };
}
