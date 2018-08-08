/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';

export function printLayoutFactory(server) {
  const config = server.config();
  const captureConfig = config.get('xpack.reporting.capture');

  const selectors = {
    screenshot: '[data-shared-item]',
    renderComplete: '[data-shared-item]',
    itemsCountAttribute: 'data-shared-items-count',
    timefilterFromAttribute: 'data-shared-timefilter-from',
    timefilterToAttribute: 'data-shared-timefilter-to',
  };

  return {

    getCssOverridesPath() {
      return path.join(__dirname, 'print.css');
    },

    getBrowserViewport() {
      return captureConfig.viewport;
    },

    getBrowserZoom() {
      return captureConfig.zoom;
    },

    getViewport(itemsCount) {
      return {
        zoom: captureConfig.zoom,
        width: captureConfig.viewport.width,
        height: captureConfig.viewport.height * itemsCount,
      };
    },

    async positionElements(browser) {
      const elementSize = {
        width: captureConfig.viewport.width / captureConfig.zoom,
        height: captureConfig.viewport.height / captureConfig.zoom
      };

      await browser.evaluate({
        fn: function (selector, height, width) {
          const visualizations = document.querySelectorAll(selector);
          const visualizationsLength = visualizations.length;

          for (let i = 0; i < visualizationsLength; i++) {
            const visualization = visualizations[i];
            const style = visualization.style;
            style.position = 'fixed';
            style.top = `${height * i}px`;
            style.left = 0;
            style.width = `${width}px`;
            style.height = `${height}px`;
            style.zIndex = 1;
            style.backgroundColor = 'inherit';
          }
        },
        args: [selectors.screenshot, elementSize.height, elementSize.width],
      });
    },

    getPdfImageSize() {
      return {
        width: 500,
      };
    },

    getPdfPageOrientation() {
      return 'portrait';
    },

    getPdfPageSize() {
      return 'A4';
    },

    groupCount: 2,

    selectors

  };
}