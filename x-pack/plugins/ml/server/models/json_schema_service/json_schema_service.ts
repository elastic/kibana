/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';

export class JsonSchemaService {
  public async extractSchema(path: string, method: string) {
    const fileContent = JSON.parse(
      Fs.readFileSync(Path.resolve(__dirname, 'openapi.json'), 'utf8')
    );

    const definition = fileContent.paths[path][method];

    if (!definition) {
      throw new Error('Definition is not defined');
    }

    const bodySchema = definition.requestBody.content['application/json'].schema;

    return bodySchema;
  }
}
