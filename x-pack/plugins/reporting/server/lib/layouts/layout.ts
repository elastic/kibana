/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CustomPageSize, PredefinedPageSize } from 'pdfmake/interfaces';
import { PageSizeParams, PdfImageSize, Size } from './';

export interface ViewZoomWidthHeight {
  zoom: number;
  width: number;
  height: number;
}

export abstract class Layout {
  public id: string = '';
  public groupCount: number = 0;

  constructor(id: string) {
    this.id = id;
  }

  public abstract getPdfImageSize(): PdfImageSize;

  public abstract getPdfPageOrientation(): 'portrait' | 'landscape' | undefined;

  public abstract getPdfPageSize(
    pageSizeParams: PageSizeParams
  ): CustomPageSize | PredefinedPageSize;

  public abstract getViewport(itemsCount: number): ViewZoomWidthHeight | null;

  public abstract getBrowserZoom(): number;

  public abstract getBrowserViewport(): Size;

  public abstract getCssOverridesPath(): string;
}
