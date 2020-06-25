/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-expect-error untyped module
import { addRegistries, register } from '@kbn/interpreter/common';
// @ts-expect-error untyped local
import { elementsRegistry } from './lib/elements_registry';
// @ts-expect-error untyped local
import { templatesRegistry } from './lib/templates_registry';
import { tagsRegistry } from './lib/tags_registry';
// @ts-expect-error untyped local
import { transitionsRegistry } from './lib/transitions_registry';

import {
  argTypeRegistry,
  datasourceRegistry,
  modelRegistry,
  transformRegistry,
  viewRegistry,
  // @ts-expect-error untyped local
} from './expression_types';
import { SetupRegistries } from './plugin_api';

export let registries = {};

export function initRegistries() {
  addRegistries(registries, {
    elements: elementsRegistry,
    transformUIs: transformRegistry,
    datasourceUIs: datasourceRegistry,
    modelUIs: modelRegistry,
    viewUIs: viewRegistry,
    argumentUIs: argTypeRegistry,
    templates: templatesRegistry,
    tagUIs: tagsRegistry,
    transitions: transitionsRegistry,
  });
}

export function populateRegistries(setupRegistries: SetupRegistries) {
  register(registries, setupRegistries);
}

export function destroyRegistries() {
  registries = {};
}
