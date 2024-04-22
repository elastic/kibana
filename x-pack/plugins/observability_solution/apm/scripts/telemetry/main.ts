/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { apmSchema } from '../../server/lib/apm_telemetry/schema';

const markdownFilePath =
  'x-pack/plugins/observability_solution/apm/dev_docs/apm_telemetry_fields.md';

function extractFieldDescriptions(
  schema: any,
  parentKeys: string[] = []
): string[] {
  const fieldDescriptions = [];
  let currentKey: string;

  for (currentKey in schema) {
    if (typeof schema[currentKey] === 'object' && schema[currentKey] !== null) {
      const description = schema[currentKey]._meta?.description;

      if (description) {
        const fullKey = [...parentKeys, currentKey].join('.');
        fieldDescriptions.push(`| \`${fullKey}\` | ${description} |`);
      }

      fieldDescriptions.push(
        ...extractFieldDescriptions(schema[currentKey], [
          ...parentKeys,
          currentKey,
        ])
      );
    }
  }

  return fieldDescriptions;
}

const metadataTable = extractFieldDescriptions(apmSchema).join('\n');
const markdownTable = `| Field | Description |\n| --- | --- |\n${metadataTable}`;

fs.writeFile(markdownFilePath, markdownTable, (err) => {
  if (err) {
    console.error('Error writing file:', err);
    process.exit(1);
  }

  console.log(`The "${markdownFilePath}" has been updated successfully.`);
});
