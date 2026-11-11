/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEisGenerationConfig } from './eis_generation_config';

// Security Labs builds are independent of the product-docs source cluster, so this
// config only runs the security labs artifact generation (ELSER + Jina).
// eslint-disable-next-line import/no-default-export
export default createEisGenerationConfig([require.resolve('./artifacts/security_labs')]);
