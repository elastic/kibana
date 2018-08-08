/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';

// you'll notice that we aren't passing the zoom at this time, while it'd be possible to use
// window.pixelDensity to figure out what the current user is seeing, if they're going to send the
// PDF to someone else, I can see there being benefit to using a higher pixel density, so we're
// going to leave this hard-coded for the time being
export function preserveLayoutFactory(server, { dimensions: { height, width }, zoom = 2 }) {
  const scaledHeight = height * zoom;
  const scaledWidth = width * zoom;

  return {
    getCssOverridesPath() {
      return path.join(__dirname, 'preserve_layout.css');
    },

    getBrowserViewport() {
      return {
        height: scaledHeight,
        width: scaledWidth,
      };
    },

    getBrowserZoom() {
      return zoom;
    },

    getViewport() {
      return {
        height: scaledHeight,
        width: scaledWidth,
        zoom
      };
    },

    getPdfImageSize() {
      return {
        height: height,
        width: width,
      };
    },

    getPdfPageOrientation() {
      return undefined;
    },

    getPdfPageSize({ pageMarginTop, pageMarginBottom, pageMarginWidth, tableBorderWidth, headingHeight, subheadingHeight }) {
      return {
        height: height + pageMarginTop + pageMarginBottom + (tableBorderWidth * 2) + headingHeight + subheadingHeight,
        width: width + (pageMarginWidth * 2) + (tableBorderWidth * 2),
      };
    },

    groupCount: 1,

    selectors: {
      screenshot: '[data-shared-items-container]',
      renderComplete: '[data-shared-item]',
      itemsCountAttribute: 'data-shared-items-count',
      timefilterFromAttribute: 'data-shared-timefilter-from',
      timefilterToAttribute: 'data-shared-timefilter-to',
    }
  };
}