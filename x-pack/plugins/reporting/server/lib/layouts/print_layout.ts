/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PageOrientation, PredefinedPageSize } from 'pdfmake/interfaces';
import { DEFAULT_VIEWPORT, LAYOUT_TYPES } from '../../../common/constants';
import { CaptureConfig } from '../../types';
import { getDefaultLayoutSelectors, LayoutInstance, LayoutSelectorDictionary } from './';
import { Layout } from './layout';

export class PrintLayout extends Layout implements LayoutInstance {
  public readonly selectors: LayoutSelectorDictionary = {
    ...getDefaultLayoutSelectors(),
    screenshot: '[data-shared-item]', // override '[data-shared-items-container]'
  };
  public readonly groupCount = 2;
  public readonly width = DEFAULT_VIEWPORT.width;
  private readonly captureConfig: CaptureConfig;
  private readonly viewport = DEFAULT_VIEWPORT;

  constructor(captureConfig: CaptureConfig) {
    super(LAYOUT_TYPES.PRINT);
    this.captureConfig = captureConfig;
  }

  public getCssOverridesPath() {
    return undefined;
  }

  public getBrowserViewport() {
    return this.viewport;
  }

  public getBrowserZoom() {
    return this.captureConfig.zoom;
  }

  public getViewport(itemsCount: number) {
    return {
      zoom: this.captureConfig.zoom,
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
