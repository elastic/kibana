/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import SwaggerParser from '@apidevtools/swagger-parser';

// Validate the entrypoint.yaml file, sothe  generated bundle will be correct.
// https://github.com/APIDevTools/swagger-parser

const validateDocs = async (entrypointFile: string) => {
  try {
    await SwaggerParser.validate(entrypointFile);
    return 'Entrypoint is valid';
  } catch (err) {
    return err;
  }
};

describe('openApi', () => {
  it('Checks that entrypoint.yaml is valid', async () => {
    expect(await validateDocs('x-pack/plugins/cases/common/openapi/entrypoint.yaml')).toEqual(
      'Entrypoint is valid'
    );
  });
});
