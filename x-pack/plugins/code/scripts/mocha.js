/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('./_helpers').runXPackScript('mocha', ['plugins/code/server/__tests__/*.{ts,tsx}']);
