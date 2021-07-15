/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';

interface PdfTracker {
  setByteLength: (byteLength: number) => void;
  startLayout: () => void;
  endLayout: () => void;
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
  const apmTrans = apm.startTransaction('reporting generate_pdf', 'reporting');

  let apmLayout: ApmSpan | null = null;
  let apmScreenshots: ApmSpan | null = null;
  let apmSetup: ApmSpan | null = null;
  let apmAddImage: ApmSpan | null = null;
  let apmCompilePdf: ApmSpan | null = null;
  let apmGetBuffer: ApmSpan | null = null;

  return {
    startLayout() {
      apmLayout = apmTrans?.startSpan('create_layout', SPANTYPE_SETUP) || null;
    },
    endLayout() {
      if (apmLayout) apmLayout.end();
    },
    startScreenshots() {
      apmScreenshots = apmTrans?.startSpan('screenshots_pipeline', SPANTYPE_SETUP) || null;
    },
    endScreenshots() {
      if (apmScreenshots) apmScreenshots.end();
    },
    startSetup() {
      apmSetup = apmTrans?.startSpan('setup_pdf', SPANTYPE_SETUP) || null;
    },
    endSetup() {
      if (apmSetup) apmSetup.end();
    },
    startAddImage() {
      apmAddImage = apmTrans?.startSpan('add_pdf_image', SPANTYPE_OUTPUT) || null;
    },
    endAddImage() {
      if (apmAddImage) apmAddImage.end();
    },
    startCompile() {
      apmCompilePdf = apmTrans?.startSpan('compile_pdf', SPANTYPE_OUTPUT) || null;
    },
    endCompile() {
      if (apmCompilePdf) apmCompilePdf.end();
    },
    startGetBuffer() {
      apmGetBuffer = apmTrans?.startSpan('get_buffer', SPANTYPE_OUTPUT) || null;
    },
    endGetBuffer() {
      if (apmGetBuffer) apmGetBuffer.end();
    },
    setByteLength(byteLength: number) {
      apmTrans?.setLabel('byte_length', byteLength, false);
    },
    end() {
      if (apmTrans) apmTrans.end();
    },
  };
}
