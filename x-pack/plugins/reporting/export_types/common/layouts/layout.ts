/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Size, ViewZoomWidthHeight } from '../../../types';

export interface PageSizeParams {
  pageMarginTop: number;
  pageMarginBottom: number;
  pageMarginWidth: number;
  tableBorderWidth: number;
  headingHeight: number;
  subheadingHeight: number;
}

export interface PdfImageSize {
  width: number;
  height?: number;
}

export abstract class Layout {
  public id: string = '';

  constructor(id: string) {
    this.id = id;
  }

  public abstract getPdfImageSize(): PdfImageSize;

  public abstract getPdfPageOrientation(): string | undefined;

  public abstract getPdfPageSize(pageSizeParams: PageSizeParams): string | Size;

  public abstract getViewport(itemsCount: number): ViewZoomWidthHeight;

  public abstract getBrowserZoom(): number;

  public abstract getBrowserViewport(): Size;

  public abstract getCssOverridesPath(): string;
}
