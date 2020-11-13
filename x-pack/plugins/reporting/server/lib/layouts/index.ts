/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LevelLogger } from '../';
import { LayoutSelectorDictionary, Size } from '../../../common/types';
import { HeadlessChromiumDriver } from '../../browsers';
import { Layout } from './layout';

export {
  LayoutParams,
  LayoutSelectorDictionary,
  PageSizeParams,
  PdfImageSize,
  Size,
} from '../../../common/types';
export { createLayout } from './create_layout';
export { Layout } from './layout';
export { PreserveLayout } from './preserve_layout';
export { PrintLayout } from './print_layout';

interface LayoutSelectors {
  // Fields that are not part of Layout: the instances
  // independently implement these fields on their own
  selectors: LayoutSelectorDictionary;
  positionElements?: (browser: HeadlessChromiumDriver, logger: LevelLogger) => Promise<void>;
}

export type LayoutInstance = Layout & LayoutSelectors & Partial<Size>;
