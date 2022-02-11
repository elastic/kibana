/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockLayout } from '../../../../../../screenshotting/server/layouts/mock';
import { PdfMaker } from '../';

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

  describe('getBuffer', () => {
    it('should generate PDF buffer', async () => {
      pdf.setTitle('the best PDF in the world');
      pdf.addImage(imageBase64, { title: 'first viz', description: '☃️' });
      pdf.addImage(imageBase64, { title: 'second viz', description: '❄️' });
      pdf.generate();

      await expect(pdf.getBuffer()).resolves.toBeInstanceOf(Buffer);
    });
  });

  describe('getPageCount', () => {
    it('should return zero pages on no content', () => {
      expect(pdf.getPageCount()).toBe(0);
    });

    it('should return a number of generated pages', () => {
      for (let i = 0; i < 100; i++) {
        pdf.addImage(imageBase64, { title: `${i} viz`, description: '☃️' });
      }
      pdf.generate();

      expect(pdf.getPageCount()).toBe(100);
    });

    it('should return a number of already flushed pages', async () => {
      for (let i = 0; i < 100; i++) {
        pdf.addImage(imageBase64, { title: `${i} viz`, description: '☃️' });
      }
      pdf.generate();
      await pdf.getBuffer();

      expect(pdf.getPageCount()).toBe(100);
    });
  });
});
