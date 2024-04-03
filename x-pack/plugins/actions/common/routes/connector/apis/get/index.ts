/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getConnectorParamsSchema } from './schemas/latest';
export type { GetConnectorParams } from './types/latest';

export { getConnectorParamsSchema as getConnectorParamsSchemaV1 } from './schemas/v1';
export type { GetConnectorParams as GetConnectorParamsV1 } from './types/v1';
