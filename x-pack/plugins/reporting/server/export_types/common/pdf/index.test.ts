/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PreserveLayout, PrintLayout } from '../../../lib/layouts';
import { createMockConfig, createMockConfigSchema } from '../../../test_helpers';
import { PdfMaker } from './';

const imageBase64 = Buffer.from(
  `iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAGFBMVEXy8vJpaWn7+/vY2Nj39/cAAACcnJzx8fFvt0oZAAAAi0lEQVR4nO3SSQoDIBBFwR7U3P/GQXKEIIJULXr9H3TMrHhX5Yysvj3jjM8+XRnVa9wec8QuHKv3h74Z+PNyGwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/xu3Bxy026rXu4ljdUVW395xUFfGzLo946DK+QW+bgCTFcecSAAAAABJRU5ErkJggg==`,
  'base64'
);

describe('PdfMaker', () => {
  it('makes PDF using PrintLayout mode', async () => {
    const config = createMockConfig(createMockConfigSchema());
    const layout = new PrintLayout(config.get('capture'));
    const pdf = new PdfMaker(layout, undefined);

    expect(pdf.setTitle('the best PDF in the world')).toBe(undefined);
    expect([
      pdf.addImage(imageBase64, { title: 'first viz', description: '☃️' }),
      pdf.addImage(imageBase64, { title: 'second viz', description: '❄️' }),
    ]).toEqual([undefined, undefined]);

    const { _layout: testLayout, _title: testTitle } = pdf as unknown as {
      _layout: object;
      _title: string;
    };
    expect(testLayout).toMatchObject({
      captureConfig: { browser: { chromium: { disableSandbox: true } } }, // NOTE: irrelevant data?
      groupCount: 2,
      id: 'print',
      selectors: {
        itemsCountAttribute: 'data-shared-items-count',
        renderComplete: '[data-shared-item]',
        screenshot: '[data-shared-item]',
        timefilterDurationAttribute: 'data-shared-timefilter-duration',
      },
    });
    expect(testTitle).toBe('the best PDF in the world');

    // generate buffer
    pdf.generate();
    const result = await pdf.getBuffer();
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('makes PDF using PreserveLayout mode', async () => {
    const layout = new PreserveLayout({ width: 400, height: 300 });
    const pdf = new PdfMaker(layout, undefined);

    expect(pdf.setTitle('the finest PDF in the world')).toBe(undefined);
    expect(pdf.addImage(imageBase64, { title: 'cool times', description: '☃️' })).toBe(undefined);

    const { _layout: testLayout, _title: testTitle } = pdf as unknown as {
      _layout: object;
      _title: string;
    };
    expect(testLayout).toMatchObject({
      groupCount: 1,
      id: 'preserve_layout',
      selectors: {
        itemsCountAttribute: 'data-shared-items-count',
        renderComplete: '[data-shared-item]',
        screenshot: '[data-shared-items-container]',
        timefilterDurationAttribute: 'data-shared-timefilter-duration',
      },
    });
    expect(testTitle).toBe('the finest PDF in the world');

    // generate buffer
    pdf.generate();
    const result = await pdf.getBuffer();
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});
