/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import $script from 'scriptjs';
import { typesRegistry } from '@kbn/interpreter/common/lib/types_registry';
import { renderFunctionsRegistry } from '@kbn/interpreter/public';
import { functionsRegistry as browserFunctions } from '@kbn/interpreter/common/lib/functions_registry';
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
  browserFunctions: browserFunctions,
  commonFunctions: browserFunctions,
  elements: elementsRegistry,
  types: typesRegistry,
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
    const remainingTypes = Object.keys(types);
    function loadType() {
      const type = remainingTypes.pop();
      window.canvas = window.canvas || {};
      window.canvas.register = d => types[type].register(d);
      // Load plugins one at a time because each needs a different loader function
      // $script will only load each of these once, we so can call this as many times as we need?
      const pluginPath = chrome.addBasePath(`/api/canvas/plugins?type=${type}`);
      $script(pluginPath, () => {
        if (remainingTypes.length) loadType();
        else resolve(true);
      });
    }

    loadType();
  });
