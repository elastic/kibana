/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayoutParams } from '../../common/layout';
import { CanvasLayout } from './canvas_layout';
import { PreserveLayout } from './preserve_layout';
import { createLayout } from './create_layout';

describe('Create Layout', () => {
  it('creates preserve layout instance', () => {
    const { id, height, width } = new PreserveLayout({ width: 16, height: 16 });
    const preserveParams: LayoutParams = { id, dimensions: { height, width } };
    const layout = createLayout(preserveParams);
    expect(layout).toMatchInlineSnapshot(`
      PreserveLayout {
        "groupCount": 1,
        "hasFooter": true,
        "hasHeader": true,
        "height": 16,
        "id": "preserve_layout",
        "scaledHeight": 32,
        "scaledWidth": 32,
        "selectors": Object {
          "itemsCountAttribute": "data-shared-items-count",
          "renderComplete": "[data-shared-item]",
          "renderError": "[data-render-error]",
          "renderErrorAttribute": "data-render-error",
          "screenshot": "[data-shared-items-container]",
          "timefilterDurationAttribute": "data-shared-timefilter-duration",
        },
        "useReportingBranding": true,
        "width": 16,
      }
    `);
  });

  it('creates the print layout', () => {
    const print = createLayout({ zoom: 1 });
    const printParams: LayoutParams = {
      id: print.id,
      zoom: 1,
    };
    const layout = createLayout(printParams);
    expect(layout).toMatchInlineSnapshot(`
      PrintLayout {
        "groupCount": 2,
        "hasFooter": true,
        "hasHeader": true,
        "id": "print",
        "selectors": Object {
          "itemsCountAttribute": "data-shared-items-count",
          "renderComplete": "[data-shared-item]",
          "renderError": "[data-render-error]",
          "renderErrorAttribute": "data-render-error",
          "screenshot": "[data-shared-item]",
          "timefilterDurationAttribute": "data-shared-timefilter-duration",
        },
        "useReportingBranding": true,
        "viewport": Object {
          "height": 1200,
          "width": 1950,
        },
        "zoom": 1,
      }
    `);
  });

  it('creates the canvas layout', () => {
    const { id, height, width } = new CanvasLayout({ width: 18, height: 18 });
    const canvasParams: LayoutParams = { id, dimensions: { height, width } };
    const layout = createLayout(canvasParams);
    expect(layout).toMatchInlineSnapshot(`
      CanvasLayout {
        "groupCount": 1,
        "hasFooter": false,
        "hasHeader": false,
        "height": 18,
        "id": "canvas",
        "scaledHeight": 36,
        "scaledWidth": 36,
        "selectors": Object {
          "itemsCountAttribute": "data-shared-items-count",
          "renderComplete": "[data-shared-item]",
          "renderError": "[data-render-error]",
          "renderErrorAttribute": "data-render-error",
          "screenshot": "[data-shared-items-container]",
          "timefilterDurationAttribute": "data-shared-timefilter-duration",
        },
        "useReportingBranding": false,
        "width": 18,
      }
    `);
  });
});
