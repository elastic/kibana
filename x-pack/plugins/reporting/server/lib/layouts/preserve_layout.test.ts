/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PreserveLayout } from './preserve_layout';

it('preserve layout uses default layout selectors', () => {
  const testPreserveLayout = new PreserveLayout({ width: 16, height: 16 });
  expect(testPreserveLayout.getCssOverridesPath()).toMatchInlineSnapshot();
  expect(testPreserveLayout.getBrowserViewport()).toMatchInlineSnapshot();
  expect(testPreserveLayout.getBrowserZoom()).toMatchInlineSnapshot();
  expect(testPreserveLayout.getPdfImageSize()).toMatchInlineSnapshot();
  expect(testPreserveLayout.getPdfPageOrientation()).toMatchInlineSnapshot();
  expect(
    testPreserveLayout.getPdfPageSize({
      pageMarginTop: 27,
      pageMarginBottom: 27,
      pageMarginWidth: 13,
      tableBorderWidth: 67,
      headingHeight: 82,
      subheadingHeight: 96,
    })
  ).toMatchInlineSnapshot();

  expect(testPreserveLayout.selectors).toMatchInlineSnapshot();
  expect(testPreserveLayout.groupCount).toMatchInlineSnapshot();
  expect(testPreserveLayout.height).toMatchInlineSnapshot();
  expect(testPreserveLayout.width).toMatchInlineSnapshot();
});

it('preserve layout allows customizable selectors', () => {
  const testPreserveLayout = new PreserveLayout(
    { width: 16, height: 16 },
    { renderComplete: '[great-test-selectors]' }
  );
  expect(testPreserveLayout.selectors).toMatchInlineSnapshot();
});
