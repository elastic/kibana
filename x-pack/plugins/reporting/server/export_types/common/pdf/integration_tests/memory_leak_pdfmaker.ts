/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { PdfMaker } from '../pdfmaker';

export class MemoryLeakPdfMaker extends PdfMaker {
  // From local testing:
  // OOMs after 456.486 seconds  with high young generation size
  // OOMs after 53.538 seconds low young generation size
  protected workerMaxOldHeapSizeMb = 2;
  protected workerMaxYoungHeapSizeMb = 2;
  protected workerModulePath = path.resolve(__dirname, './memory_leak_worker.js');
}
