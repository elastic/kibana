/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as baseApiTest, mergeTests } from '@kbn/scout-oblt';
import { synthtraceFixture } from '@kbn/scout-synthtrace';

export const apiTest = mergeTests(baseApiTest, synthtraceFixture);

export { testData } from '../../shared';
