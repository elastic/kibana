/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomPageSize, PredefinedPageSize } from 'pdfmake/interfaces';
import type { Size } from '../../common/layout';

export interface ViewZoomWidthHeight {
  zoom: number;
  width: number;
  height: number;
}

export interface PdfImageSize {
  width: number;
  height?: number;
}

export interface PageSizeParams {
  pageMarginTop: number;
  pageMarginBottom: number;
  pageMarginWidth: number;
  tableBorderWidth: number;
  headingHeight: number;
  subheadingHeight: number;
}

export abstract class BaseLayout {
  public id: string = '';
  public groupCount: number = 0;

  public hasHeader: boolean = true;
  public hasFooter: boolean = true;
  public useReportingBranding: boolean = true;

  constructor(id: string) {
    this.id = id;
  }

  public abstract getPdfImageSize(): PdfImageSize;

  public abstract getPdfPageOrientation(): 'portrait' | 'landscape' | undefined;

  public abstract getPdfPageSize(
    pageSizeParams: PageSizeParams
  ): CustomPageSize | PredefinedPageSize;

  // Return the dimensions unscaled dimensions (before multiplying the zoom factor)
  // driver.setViewport() Adds a top and left margin to the viewport, and then multiplies by the scaling factor
  public abstract getViewport(itemsCount: number): ViewZoomWidthHeight | null;

  public abstract getBrowserZoom(): number;

  public abstract getBrowserViewport(): Size;

  public abstract getCssOverridesPath(): string | undefined;
}
