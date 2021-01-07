/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getDefaultLayoutSelectors,
  LayoutInstance,
  LayoutSelectorDictionary,
  LayoutTypes,
  PageSizeParams,
  Size,
} from './';
import { Layout } from './layout';

// FIXME - should use zoom from capture config
const ZOOM: number = 2;

/*
 * This class provides a Layout definition. The PdfMaker class uses this to
 * define a document layout that includes no margins or branding or added logos.
 * The single image that was captured should be the only structural part of the
 * PDF document definition
 */
export class CanvasLayout extends Layout implements LayoutInstance {
  public readonly selectors: LayoutSelectorDictionary = getDefaultLayoutSelectors();
  public readonly groupCount = 1;
  public readonly height: number;
  public readonly width: number;
  private readonly scaledHeight: number;
  private readonly scaledWidth: number;

  public hasHeader: boolean = false;
  public hasFooter: boolean = false;
  public useReportingBranding: boolean = false;

  constructor(size: Size) {
    super(LayoutTypes.CANVAS);
    this.height = size.height;
    this.width = size.width;
    this.scaledHeight = size.height * ZOOM;
    this.scaledWidth = size.width * ZOOM;
  }

  public getPdfPageOrientation() {
    return undefined;
  }

  public getCssOverridesPath() {
    return undefined;
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

  public getPdfPageSize(pageSizeParams: PageSizeParams): Size {
    return {
      height: this.height,
      width: this.width,
    };
  }
}
