/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import path from 'path';
import { isUint8Array } from 'util/types';
import { createMockLayout } from '../../../../../../screenshotting/server/layouts/mock';
import { PdfMaker } from '../';
import { PdfWorkerOutOfMemoryError } from '../pdfmaker_errors';

const imageBase64 = Buffer.from(
  `iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAGFBMVEXy8vJpaWn7+/vY2Nj39/cAAACcnJzx8fFvt0oZAAAAi0lEQVR4nO3SSQoDIBBFwR7U3P/GQXKEIIJULXr9H3TMrHhX5Yysvj3jjM8+XRnVa9wec8QuHKv3h74Z+PNyGwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/xu3Bxy026rXu4ljdUVW395xUFfGzLo946DK+QW+bgCTFcecSAAAAABJRU5ErkJggg==`,
  'base64'
);

describe('PdfMaker', () => {
  let layout: ReturnType<typeof createMockLayout>;
  let pdf: PdfMaker;

  beforeEach(() => {
    layout = createMockLayout();
    pdf = new PdfMaker(layout, undefined);
  });

  describe('generate', () => {
    it('should generate PDF array buffer', async () => {
      pdf.setTitle('the best PDF in the world');
      pdf.addImage(imageBase64, { title: 'first viz', description: '☃️' });
      pdf.addImage(imageBase64, { title: 'second viz', description: '❄️' });

      expect(isUint8Array(await pdf.generate())).toBe(true);
    });
  });

  describe('worker', () => {
    it('should report when the PDF worker runs out of memory instead of crashing the main thread', async () => {
      const leakyMaker = new (class MemoryLeakPdfMaker extends PdfMaker {
        // From local testing:
        // OOMs after 456.486 seconds with high young generation size
        // OOMs after 53.538 seconds low young generation size
        protected workerMaxOldHeapSizeMb = 2;
        protected workerMaxYoungHeapSizeMb = 2;
        protected workerModulePath = path.resolve(__dirname, './memory_leak_worker.js');
      })(layout, undefined);
      await expect(leakyMaker.generate()).rejects.toBeInstanceOf(PdfWorkerOutOfMemoryError);
    });

    it('restarts the PDF worker if it crashes', async () => {
      const buggyWorker = new (class BuggyPdfMaker extends PdfMaker {
        protected workerModulePath = path.resolve(__dirname, './buggy_worker.js');
      })(layout, undefined);

      await expect(buggyWorker.generate()).rejects.toEqual(new Error('This is a bug'));
      await expect(buggyWorker.generate()).rejects.toEqual(new Error('This is a bug'));
      await expect(buggyWorker.generate()).rejects.toEqual(new Error('This is a bug'));
    });
  });
});
