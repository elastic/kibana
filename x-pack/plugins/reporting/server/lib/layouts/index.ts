/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriver } from '../../browsers';
import { LevelLogger } from '../';
import { Layout } from './layout';

export { createLayout } from './create_layout';
export { Layout } from './layout';
export { PreserveLayout } from './preserve_layout';
export { PrintLayout } from './print_layout';

export const LayoutTypes = {
  PRESERVE_LAYOUT: 'preserve_layout',
  PRINT: 'print',
};

export const getDefaultLayoutSelectors = (): LayoutSelectorDictionary => ({
  screenshot: '[data-shared-items-container]',
  renderComplete: '[data-shared-item]',
  itemsCountAttribute: 'data-shared-items-count',
  timefilterDurationAttribute: 'data-shared-timefilter-duration',
});

export interface PageSizeParams {
  pageMarginTop: number;
  pageMarginBottom: number;
  pageMarginWidth: number;
  tableBorderWidth: number;
  headingHeight: number;
  subheadingHeight: number;
}

export interface LayoutSelectorDictionary {
  screenshot: string;
  renderComplete: string;
  itemsCountAttribute: string;
  timefilterDurationAttribute: string;
}

export interface PdfImageSize {
  width: number;
  height?: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface LayoutParams {
  id: string;
  dimensions: Size;
}

interface LayoutSelectors {
  // Fields that are not part of Layout: the instances
  // independently implement these fields on their own
  selectors: LayoutSelectorDictionary;
  positionElements?: (browser: HeadlessChromiumDriver, logger: LevelLogger) => Promise<void>;
}

export type LayoutInstance = Layout & LayoutSelectors & Size;
