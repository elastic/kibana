/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, map, partialRight, pick } from 'lodash';
import { promises as fs } from 'fs';
import path from 'path';

import { run } from '@kbn/dev-utils';

const OSQUERY_COLUMN_SCHEMA_FIELDS = ['name', 'description', 'platforms', 'columns'];
const ELASTIC_OSQUERY_HOSTFS_TABLES = ['users', 'groups', 'processes'];

run(
  async ({ flags }) => {
    const schemaPath = path.resolve(`../public/common/schemas/osquery/`);
    const schemaFile = path.join(schemaPath, flags.schema_version as string);
    const schemaData = await require(schemaFile);

    const formattedSchema = map(schemaData, partialRight(pick, OSQUERY_COLUMN_SCHEMA_FIELDS));
    const elasticTables = map(ELASTIC_OSQUERY_HOSTFS_TABLES, (tableName) => ({
      ...find(formattedSchema, { name: tableName }),
      name: `host_${tableName}`,
    }));
    formattedSchema.push(...elasticTables);

    await fs.writeFile(
      path.join(schemaPath, `${flags.schema_version}`),
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
        --schema_version The semver string for the schema file located in public/common/schemas/osquery/
      `,
    },
  }
);
