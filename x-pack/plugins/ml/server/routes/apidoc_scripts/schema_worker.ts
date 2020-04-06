/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractDocumentation } from './schema_extractor';

interface ApiParameter {
  group: string;
  type: any;
  size: undefined;
  allowedValues: undefined;
  optional: boolean;
  field: string;
  defaultValue: undefined;
  description?: string;
}

interface Local {
  group: string;
  type: string;
  url: string;
  title: string;
  name: string;
  description: string;
  parameter: {
    fields: {
      Parameter: ApiParameter[];
    };
  };
  success: { fields: ObjectConstructor[] };
  version: string;
  filename: string;
  schema?: string;
}

interface Block {
  global: any;
  local: Local;
}

export function postProcess(parsedFiles: any[]): void {
  const schemasDirPath = `${__dirname}${path.sep}..${path.sep}..${path.sep}schemas/`;
  const schemaFiles = fs
    .readdirSync(schemasDirPath)
    .map(filename => path.resolve(schemasDirPath + filename));

  const schemaDocs = extractDocumentation(schemaFiles);

  parsedFiles.forEach(parsedFile => {
    parsedFile.forEach((block: Block) => {
      const {
        local: { schema },
      } = block;
      if (!schema) return;
      const schemaFields = schemaDocs.get(schema);
      if (!schemaFields) return;

      // Init parameters object
      if (!block.local.parameter) {
        block.local.parameter = {
          fields: { Parameter: [] },
        };
      }

      for (const field of schemaFields) {
        block.local!.parameter!.fields!.Parameter.push({
          group: 'Parameter',
          type: field.type,
          size: undefined,
          allowedValues: undefined,
          optional: !!field.optional,
          field: field.name,
          defaultValue: undefined,
          description: field.documentation,
        });
      }
    });
  });
}
