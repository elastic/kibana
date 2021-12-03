/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import path from 'path';
import type { CustomPageSize } from 'pdfmake/interfaces';
import type { LayoutSelectorDictionary, Size } from '../../common/layout';
import { LayoutTypes } from '../../common';
import { DEFAULT_SELECTORS } from '.';
import type { Layout } from '.';
import { BaseLayout } from './base_layout';
import type { PageSizeParams } from './base_layout';

// We use a zoom of two to bump up the resolution of the screenshot a bit.
const ZOOM: number = 2;

export class PreserveLayout extends BaseLayout implements Layout {
  public readonly selectors: LayoutSelectorDictionary;
  public readonly groupCount = 1;
  public readonly height: number;
  public readonly width: number;
  private readonly scaledHeight: number;
  private readonly scaledWidth: number;

  constructor(size: Size, selectors?: Partial<LayoutSelectorDictionary>) {
    super(LayoutTypes.PRESERVE_LAYOUT);
    this.height = size.height;
    this.width = size.width;
    this.scaledHeight = size.height * ZOOM;
    this.scaledWidth = size.width * ZOOM;

    this.selectors = { ...DEFAULT_SELECTORS, ...selectors };
  }

  public getCssOverridesPath() {
    // TODO: Remove this path once we have migrated all plugins away from depending on this hiding page elements.
    return path.join(__dirname, 'preserve_layout.css');
  }

  public getBrowserViewport() {
    return {
      height: this.scaledHeight,
      width: this.scaledWidth,
    };
  }

  public getBrowserZoom() {
    return ZOOM;
  }

  public getViewport() {
    return {
      height: this.height,
      width: this.width,
      zoom: ZOOM,
    };
  }

  public getPdfImageSize() {
    return {
      height: this.height,
      width: this.width,
    };
  }

  public getPdfPageOrientation() {
    return undefined;
  }

  public getPdfPageSize(pageSizeParams: PageSizeParams): CustomPageSize {
    return {
      height:
        this.height +
        pageSizeParams.pageMarginTop +
        pageSizeParams.pageMarginBottom +
        pageSizeParams.tableBorderWidth * 2 +
        pageSizeParams.headingHeight +
        pageSizeParams.subheadingHeight,
      width: this.width + pageSizeParams.pageMarginWidth * 2 + pageSizeParams.tableBorderWidth * 2,
    };
  }
}
