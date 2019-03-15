/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { config } from './sampleConfig';
import { registerPipeline } from './sampleVis';

registerPipeline();

// TODO register config instead
let c = config;
c = c;
