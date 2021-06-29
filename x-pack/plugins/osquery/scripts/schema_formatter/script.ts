/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as fs } from 'fs';
import path from 'path';

import { run } from '@kbn/dev-utils';
interface DestField {
  [key: string]: boolean | DestField;
}

run(
  async ({ flags }) => {
    const schemaPath = path.resolve('./public/editor/osquery_schema/');
    const schemaFile = path.join(schemaPath, flags.schema_version as string);
    const schemaData = await require(schemaFile);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function pullFields(destSchema: DestField, source: { [key: string]: any }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dest: { [key: string]: any } = {};
      Object.keys(destSchema).forEach((key) => {
        switch (typeof source[key]) {
          case 'object':
            dest[key] = pullFields(destSchema[key] as DestField, source[key]);
            break;
          default:
            dest[key] = source[key];
        }
      });
      return dest;
    }

    const mapFunc = pullFields.bind(null, { name: true });
    const formattedSchema = schemaData.map(mapFunc);
    await fs.writeFile(
      path.join(schemaPath, `${flags.schema_version}-formatted.json`),
      JSON.stringify(formattedSchema)
    );
  },
  {
    description: `
      Script for formatting generated osquery API schema JSON file.
    `,
    flags: {
      string: ['schema_version'],
      help: `
        --schema_version The semver string for the schema file located in public/editor/osquery_schema
      `,
    },
  }
);
