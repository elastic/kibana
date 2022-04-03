/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This file is the harness for importing worker.ts with Kibana running in dev mode.
 * The TS file needs to be compiled on the fly, unlike when Kibana is running as a dist.
 */

require('../../../../../../../src/setup_node_env');
// eslint-disable-next-line @kbn/imports/uniform_imports
require('./worker.ts');
