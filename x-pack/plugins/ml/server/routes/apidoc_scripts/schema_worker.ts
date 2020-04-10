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
      [key: string]: ApiParameter[] | undefined;
    };
  };
  success: { fields: ObjectConstructor[] };
  version: string;
  filename: string;
  schema?: {
    name: string;
    group: string;
  };
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
      const { name: schemaName, group: paramsGroup } = schema;
      const schemaFields = schemaDocs.get(schemaName);

      if (!schemaFields) return;

      extractDocEntries(schemaFields, block, paramsGroup);
    });
  });
}

/**
 * Extracts schema's doc entries to apidoc parameters
 * @param docEntries
 * @param block
 * @param paramsGroup
 */
function extractDocEntries(docEntries: DocEntry[], block: Block, paramsGroup: string): void {
  if (!block.local.parameter) {
    block.local.parameter = {
      fields: {},
    };
  }

  if (!block.local.parameter.fields![paramsGroup]) {
    block.local.parameter.fields![paramsGroup] = [];
  }
  const collection = block.local.parameter.fields![paramsGroup] as ApiParameter[];

  for (const field of docEntries) {
    collection.push({
      group: paramsGroup,
      type: escapeSpecial(field.type),
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

/**
 * Escape special character to make sure the markdown table isn't broken
 */
function escapeSpecial(str: string): string {
  return str.replace(/\|/g, '\\|');
}
