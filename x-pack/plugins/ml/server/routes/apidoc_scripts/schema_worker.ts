/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DocEntry, extractDocumentation } from './schema_extractor';

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
    fields?: {
      Parameter?: ApiParameter[];
      [key: string]: ApiParameter[] | undefined;
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

      // Init parameters collection
      if (!block.local.parameter) {
        block.local.parameter = {
          fields: { Parameters: [] },
        };
      }

      if (!block.local.parameter.fields!.Parameters) {
        block.local.parameter.fields!.Parameters = [];
      }

      extractDocEntries(schemaFields, block);
    });
  });
}

/**
 * Extracts schema's doc entries to apidoc parameters
 * @param docEntries
 * @param block
 * @param nestedPrefix
 */
function extractDocEntries(docEntries: DocEntry[], block: Block, nestedPrefix = ''): void {
  for (const field of docEntries) {
    let collection = (block.local!.parameter!.fields!.Parameters as unknown) as ApiParameter[];
    let group = 'Parameters';

    if (nestedPrefix.length > 0) {
      // @ts-ignore
      if (!block.local.parameter.fields[nestedPrefix]) {
        // @ts-ignore
        block.local.parameter.fields[nestedPrefix] = [];
      }
      // @ts-ignore
      collection = block.local.parameter.fields[nestedPrefix];

      group = nestedPrefix;
    }

    collection.push({
      group,
      type: field.type,
      size: undefined,
      allowedValues: undefined,
      optional: !!field.optional,
      field: field.name,
      defaultValue: undefined,
      description: field.documentation,
    });

    if (field.nested) {
      extractDocEntries(field.nested, block, field.name);
    }
  }
}
