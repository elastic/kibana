/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerPipeline } from './xy_chart_vis';

registerPipeline();

// TODO register config instead
export { config } from './xy_chart_plugin';
