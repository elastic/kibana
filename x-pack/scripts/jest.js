/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');

if (process.env.KBN_JEST_CONTRACT_DISABLED === 'true') {
  require('@kbn/test').runJest();
} else {
  require('@kbn/test').runJestContract();
}
