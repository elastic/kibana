/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PageOrientation, PredefinedPageSize } from 'pdfmake/interfaces';
import type { Layout } from '.';
import { DEFAULT_SELECTORS } from '.';
import type { LayoutParams, LayoutSelectorDictionary } from '../../common/layout';
import { DEFAULT_VIEWPORT } from '../browsers';
import { BaseLayout } from './base_layout';

export const getPrintLayoutSelectors: () => LayoutSelectorDictionary = () => ({
  ...DEFAULT_SELECTORS,
  screenshot: '[data-shared-item]', // override '[data-shared-items-container]'
});

export class PrintLayout extends BaseLayout implements Layout {
  public readonly selectors = getPrintLayoutSelectors();
  private readonly viewport = DEFAULT_VIEWPORT;
  private zoom: number;

  constructor({ zoom = 1 }: Pick<LayoutParams, 'zoom'>) {
    super('print');

    this.zoom = zoom;
  }

  public getCssOverridesPath() {
    return undefined;
  }

  public getBrowserViewport() {
    return this.viewport;
  }

  public getBrowserZoom() {
    return this.zoom;
  }

  public getViewport(itemsCount = 1) {
    return {
      zoom: this.zoom,
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
