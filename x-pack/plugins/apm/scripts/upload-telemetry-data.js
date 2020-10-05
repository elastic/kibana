/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// compile typescript on the fly
// eslint-disable-next-line import/no-extraneous-dependencies
require('@kbn/optimizer').registerNodeAutoTranspilation();

require('./upload-telemetry-data/index.ts');
