/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
  getDefaultEuiMarkdownUiPlugins,
} from '@elastic/eui';
import { TemporaryProcessingPluginsType } from './types';

export const {
  uiPlugins: defaultUiPlugins,
  parsingPlugins: defaultParsingPlugins,
  processingPlugins: defaultProcessingPlugins,
} = {
  uiPlugins: getDefaultEuiMarkdownUiPlugins(),
  parsingPlugins: getDefaultEuiMarkdownParsingPlugins(),
  processingPlugins: getDefaultEuiMarkdownProcessingPlugins() as TemporaryProcessingPluginsType,
};
