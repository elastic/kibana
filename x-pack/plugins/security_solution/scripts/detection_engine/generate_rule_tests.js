/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// command utility to generate a valid e2e rule test
require('../../../../../src/setup_node_env');
require('@kbn/securitysolution-rule-test-generator').runGenerateTestsCli();
