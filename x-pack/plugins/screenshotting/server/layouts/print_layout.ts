/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PageOrientation, PredefinedPageSize } from 'pdfmake/interfaces';
import type { LayoutConfig, LayoutInstance, LayoutSelectorDictionary } from '.';
import { LayoutTypes } from '.';
import { DEFAULT_VIEWPORT } from '../browsers';
import { getDefaultLayoutSelectors } from '.';
import { Layout } from './layout';

export class PrintLayout extends Layout implements LayoutInstance {
  public readonly selectors: LayoutSelectorDictionary = {
    ...getDefaultLayoutSelectors(),
    screenshot: '[data-shared-item]', // override '[data-shared-items-container]'
  };
  public readonly groupCount = 2;
  private readonly viewport = DEFAULT_VIEWPORT;

  constructor(private readonly config: LayoutConfig) {
    super(LayoutTypes.PRINT);
  }

  public getCssOverridesPath() {
    return undefined;
  }

  public getBrowserViewport() {
    return this.viewport;
  }

  public getBrowserZoom() {
    return this.config.zoom;
  }

  public getViewport(itemsCount: number) {
    return {
      zoom: this.config.zoom,
      width: this.viewport.width,
      height: this.viewport.height * itemsCount,
    };
  }

  public getPdfImageSize() {
    return {
      width: 500,
    };
  }

  public getPdfPageOrientation(): PageOrientation {
    return 'portrait';
  }

  public getPdfPageSize(): PredefinedPageSize {
    return 'A4';
  }
}
