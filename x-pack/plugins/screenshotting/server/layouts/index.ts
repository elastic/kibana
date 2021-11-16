/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'src/core/server';
import type { LayoutSelectorDictionary, Size } from '../../common/layout';
import type { HeadlessChromiumDriver } from '../browsers';
import type { BaseLayout } from './base_layout';

interface LayoutSelectors {
  // Fields that are not part of Layout: the instances
  // independently implement these fields on their own
  selectors: LayoutSelectorDictionary;
  positionElements?(browser: HeadlessChromiumDriver, logger: Logger): Promise<void>;
}

export type Layout = BaseLayout & LayoutSelectors & Partial<Size>;

export const LayoutTypes = {
  PRESERVE_LAYOUT: 'preserve_layout',
  PRINT: 'print',
  CANVAS: 'canvas', // no margins or branding in the layout
};

export const DEFAULT_SELECTORS: LayoutSelectorDictionary = {
  screenshot: '[data-shared-items-container]',
  renderComplete: '[data-shared-item]',
  renderError: '[data-render-error]',
  renderErrorAttribute: 'data-render-error',
  itemsCountAttribute: 'data-shared-items-count',
  timefilterDurationAttribute: 'data-shared-timefilter-duration',
};

export { createLayout } from './create_layout';
