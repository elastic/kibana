/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonSchemaService } from './json_schema_service';

describe('JsonSchemaService', function () {
  test('extract schema definition', async () => {
    const service = new JsonSchemaService();

    const result = await service.extractSchema('/_ml/anomaly_detectors/{job_id}', 'put');

    expect(result).toEqual({});
  });
});
