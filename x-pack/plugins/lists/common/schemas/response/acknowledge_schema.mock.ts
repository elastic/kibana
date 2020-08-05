/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AcknowledgeSchema } from './acknowledge_schema';

export const getAcknowledgeSchemaResponseMock = (): AcknowledgeSchema => ({
  acknowledged: true,
});
