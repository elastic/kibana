/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import path from 'path';
import {
  kbn_server,
  ViewWidthHeight,
  ViewZoomWidthHeight,
} from '../../../../../../../../src/server/index';
import { Layout } from './layout';

interface Pagesizeparams {
  pageMarginTop: number;
  pageMarginBottom: number;
  pageMarginWidth: number;
  tableBorderWidth: number;
  headingHeight: number;
  subheadingHeight: number;
}

export class Preservelayout extends Layout {
  public groupCount: number = 1;

  public selectors = {
    screenshot: '[data-shared-items-container]',
    renderComplete: '[data-shared-item]',
    itemsCountAttribute: 'data-shared-items-count',
    timefilterFromAttribute: 'data-shared-timefilter-from',
    timefilterToAttribute: 'data-shared-timefilter-to',
  };

  public height: number = 0;
  public width: number = 0;
  public zoom: number = 0;

  constructor(server: kbn_server, id: string, height: number, width: number, zoom: number) {
    super(id, server);
    this.height = height;
    this.width = width;
    this.zoom = zoom;
  }

  get scaledHeight(): number {
    return this.height * this.zoom;
  }

  get scaledWidth(): number {
    return this.width * this.zoom;
  }

  public getCssOverridesPath(): string {
    return path.join(__dirname, 'preserve_layout.css');
  }

  public getBrowserViewport(): ViewWidthHeight {
    return {
      height: this.scaledHeight,
      width: this.scaledWidth,
    };
  }

  public getBrowserZoom(): number {
    return this.zoom;
  }

  public getViewport(): ViewZoomWidthHeight {
    return {
      height: this.scaledHeight,
      width: this.scaledWidth,
      zoom: this.zoom,
    };
  }

  public getPdfImageSize(): ViewWidthHeight {
    return {
      height: this.height,
      width: this.width,
    };
  }

  public getPdfPageOrientation(): undefined {
    return undefined;
  }

  public getPdfPageSize(pagesizeparams: Pagesizeparams): ViewWidthHeight {
    return {
      height:
        this.height +
        pagesizeparams.pageMarginTop +
        pagesizeparams.pageMarginBottom +
        pagesizeparams.tableBorderWidth * 2 +
        pagesizeparams.headingHeight +
        pagesizeparams.subheadingHeight,
      width: this.width + pagesizeparams.pageMarginWidth * 2 + pagesizeparams.tableBorderWidth * 2,
    };
  }
}
