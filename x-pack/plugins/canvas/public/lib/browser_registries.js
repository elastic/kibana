/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import $script from 'scriptjs';
import { typesRegistry } from '../../common/lib/types_registry';
import {
  argTypeRegistry,
  datasourceRegistry,
  transformRegistry,
  modelRegistry,
  viewRegistry,
} from '../expression_types';
import { elementsRegistry } from './elements_registry';
import { renderFunctionsRegistry } from './render_functions_registry';
import { functionsRegistry as browserFunctions } from './functions_registry';
import { loadPrivateBrowserFunctions } from './load_private_browser_functions';

const registries = {
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

let resolve = null;
let called = false;

const populatePromise = new Promise(_resolve => {
  resolve = _resolve;
});

export const getBrowserRegistries = () => {
  return populatePromise;
};

export const populateBrowserRegistries = () => {
  if (called) throw new Error('function should only be called once per process');
  called = true;

  // loadPrivateBrowserFunctions is sync. No biggie.
  loadPrivateBrowserFunctions();

  const remainingTypes = Object.keys(registries);
  const populatedTypes = {};

  function loadType() {
    const type = remainingTypes.pop();
    window.canvas = window.canvas || {};
    window.canvas.register = d => registries[type].register(d);

    // Load plugins one at a time because each needs a different loader function
    // $script will only load each of these once, we so can call this as many times as we need?
    const pluginPath = chrome.addBasePath(`/api/canvas/plugins?type=${type}`);
    $script(pluginPath, () => {
      populatedTypes[type] = registries[type];

      if (remainingTypes.length) loadType();
      else resolve(populatedTypes);
    });
  }

  if (remainingTypes.length) loadType();
  return populatePromise;
};
