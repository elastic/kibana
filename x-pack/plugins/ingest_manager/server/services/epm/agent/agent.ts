/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Handlebars from 'handlebars';
import { RegistryVarsEntry } from '../../../types';

/**
 * This takes a dataset object as input and merges it with the input template.
 * It returns the resolved template as a string.
 */
export function createInput(vars: RegistryVarsEntry[], inputTemplate: string): string {
  const view: Record<RegistryVarsEntry['name'], RegistryVarsEntry['default']> = {};

  for (const v of vars) {
    view[v.name] = v.default;
  }

  const template = Handlebars.compile(inputTemplate);
  return template(view);
}
