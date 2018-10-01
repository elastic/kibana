/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderFunctionsRegistry } from '@kbn/interpreter/public';
import { loadBrowserPlugins as loadCorePlugins } from '@kbn/interpreter/public/load_browser_plugins';
import {
  argTypeRegistry,
  datasourceRegistry,
  transformRegistry,
  modelRegistry,
  viewRegistry,
} from '../expression_types';
import { elementsRegistry } from './elements_registry';
import { loadPrivateBrowserFunctions } from './load_private_browser_functions';

const types = {
  elements: elementsRegistry,
  renderers: renderFunctionsRegistry,
  transformUIs: transformRegistry,
  datasourceUIs: datasourceRegistry,
  modelUIs: modelRegistry,
  viewUIs: viewRegistry,
  argumentUIs: argTypeRegistry,
};

export const loadBrowserPlugins = () =>
  new Promise(resolve => {
    loadPrivateBrowserFunctions();
    loadCorePlugins(types).then(resolve);
  });
