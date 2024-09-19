/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LevelLogger } from '../';
import { Size } from '../../../common/types';
import { HeadlessChromiumDriver } from '../../browsers';
import type { Layout } from './layout';

export interface LayoutSelectorDictionary {
  screenshot: string;
  renderComplete: string;
  itemsCountAttribute: string;
  timefilterDurationAttribute: string;
}

export { LayoutParams, PageSizeParams, PdfImageSize, Size } from '../../../common/types';
export { CanvasLayout } from './canvas_layout';
export { createLayout } from './create_layout';
export type { Layout } from './layout';
export { PreserveLayout } from './preserve_layout';
export { PrintLayout } from './print_layout';

export const LayoutTypes = {
  PRESERVE_LAYOUT: 'preserve_layout',
  PRINT: 'print',
  CANVAS: 'canvas', // no margins or branding in the layout
};

export const getDefaultLayoutSelectors = (): LayoutSelectorDictionary => ({
  screenshot: '[data-shared-items-container]',
  renderComplete: '[data-shared-item]',
  itemsCountAttribute: 'data-shared-items-count',
  timefilterDurationAttribute: 'data-shared-timefilter-duration',
});

interface LayoutSelectors {
  // Fields that are not part of Layout: the instances
  // independently implement these fields on their own
  selectors: LayoutSelectorDictionary;
  positionElements?: (browser: HeadlessChromiumDriver, logger: LevelLogger) => Promise<void>;
}

export type LayoutInstance = Layout & LayoutSelectors & Partial<Size>;
