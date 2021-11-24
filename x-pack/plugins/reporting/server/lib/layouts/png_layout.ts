/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { LAYOUT_TYPES } from '../../../common/constants';
import { Size } from '../../../common/types';
import { getDefaultLayoutSelectors, LayoutInstance, LayoutSelectorDictionary } from './';
import { Layout } from './layout';

// We use a zoom of two to bump up the resolution of the screenshot a bit.
// FIXME: should be based on config
const ZOOM: number = 2;

export class PngLayout extends Layout implements LayoutInstance<PngLayout> {
  public readonly selectors: LayoutSelectorDictionary;
  public readonly groupCount = 1;
  public readonly height: number;
  public readonly width: number;
  private readonly scaledHeight: number;
  private readonly scaledWidth: number;

  constructor(size: Size, selectors?: Partial<LayoutSelectorDictionary>) {
    super(LAYOUT_TYPES.PNG);
    this.height = size.height;
    this.width = size.width;
    this.scaledHeight = size.height * ZOOM;
    this.scaledWidth = size.width * ZOOM;

    this.selectors = {
      ...getDefaultLayoutSelectors(),
      ...selectors,
    };
  }

  public getCssOverridesPath() {
    return path.join(__dirname, 'preserve_layout.css'); // NOTE: copy pasted from preserve_layout
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
}
