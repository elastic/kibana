/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { register } from '@kbn/interpreter/common';
// @ts-ignore
import { registries } from 'plugins/interpreter/registries';

import { sampleDataFunction } from './sample_data';

export function registerFunctions() {
  register(registries, {
    browserFunctions: [sampleDataFunction],
  });
}
