/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');

if (require('@kbn/dev-validation-runner').hasValidationRunFlags(process.argv.slice(2))) {
  require('@kbn/test').runJestContract();
} else {
  require('@kbn/test').runJest();
}
