/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PreserveLayout } from './preserve_layout';

it('preserve layout uses default layout selectors', () => {
  const testPreserveLayout = new PreserveLayout({ width: 16, height: 16 });

  expect(testPreserveLayout.getCssOverridesPath()).toMatch(`layouts/preserve_layout.css`);
  expect(testPreserveLayout.getBrowserViewport()).toMatchObject({ height: 32, width: 32 });
  expect(testPreserveLayout.getBrowserZoom()).toBe(2);
  expect(testPreserveLayout.getPdfImageSize()).toMatchObject({ height: 16, width: 16 });
  expect(testPreserveLayout.getPdfPageOrientation()).toBe(undefined);
  expect(
    testPreserveLayout.getPdfPageSize({
      pageMarginTop: 27,
      pageMarginBottom: 27,
      pageMarginWidth: 13,
      tableBorderWidth: 67,
      headingHeight: 82,
      subheadingHeight: 96,
    })
  ).toMatchObject({ height: 382, width: 176 });
  expect(testPreserveLayout.selectors).toMatchInlineSnapshot(`
    Object {
      "itemsCountAttribute": "data-shared-items-count",
      "renderComplete": "[data-shared-item]",
      "renderError": "[data-render-error]",
      "renderErrorAttribute": "data-render-error",
      "screenshot": "[data-shared-items-container]",
      "timefilterDurationAttribute": "data-shared-timefilter-duration",
    }
  `);
  expect(testPreserveLayout.groupCount).toBe(1);
  expect(testPreserveLayout.height).toBe(16);
  expect(testPreserveLayout.width).toBe(16);
});

it('preserve layout allows customizable selectors', () => {
  const testPreserveLayout = new PreserveLayout(
    { width: 16, height: 16 },
    { renderComplete: '[great-test-selectors]' }
  );

  expect(testPreserveLayout.selectors).toMatchInlineSnapshot(`
    Object {
      "itemsCountAttribute": "data-shared-items-count",
      "renderComplete": "[great-test-selectors]",
      "renderError": "[data-render-error]",
      "renderErrorAttribute": "data-render-error",
      "screenshot": "[data-shared-items-container]",
      "timefilterDurationAttribute": "data-shared-timefilter-duration",
    }
  `);
});
