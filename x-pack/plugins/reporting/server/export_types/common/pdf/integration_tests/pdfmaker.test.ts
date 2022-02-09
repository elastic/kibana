/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUint8Array } from 'util/types';
import { createMockLayout } from '../../../../../../screenshotting/server/layouts/mock';
import { PdfMaker } from '../';
import { PdfWorkerOutOfMemoryError } from '../pdfmaker_errors';
import { MemoryLeakPdfMaker } from './memory_leak_pdfmaker';

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
      const leakyMaker = new MemoryLeakPdfMaker(layout, undefined);
      await expect(leakyMaker.generate()).rejects.toBeInstanceOf(PdfWorkerOutOfMemoryError);
    });
  });
});
