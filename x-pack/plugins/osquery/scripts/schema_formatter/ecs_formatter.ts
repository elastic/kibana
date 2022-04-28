/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, map, partialRight, pick } from 'lodash';
import { promises as fs } from 'fs';
import path from 'path';

import { run } from '@kbn/dev-utils';

const ECS_COLUMN_SCHEMA_FIELDS = ['field', 'type', 'normalization', 'example', 'description'];

const RESTRICTED_FIELDS = [
  'agent.name',
  'agent.id',
  'agent.ephemeral_id',
  'agent.type',
  'agent.version',
  'ecs.version',
  'event.agent_id_status',
  'event.ingested',
  'event.module',
  'host.hostname',
  'host.os.build',
  'host.os.kernel',
  'host.os.name',
  'host.os.family',
  'host.os.type',
  'host.os.version',
  'host.platform',
  'host.ip',
  'host.id',
  'host.mac',
  'host.architecture',
  '@timestamp',
];

run(
  async ({ flags }) => {
    const schemaPath = path.resolve(`../../public/common/schemas/ecs/`);
    const schemaFile = path.join(schemaPath, flags.schema_version as string);
    const schemaData = await require(schemaFile);

    const filteredSchemaData = filter(
      schemaData,
      (field) => !RESTRICTED_FIELDS.includes(field.field)
    );
    const formattedSchema = map(filteredSchemaData, partialRight(pick, ECS_COLUMN_SCHEMA_FIELDS));

    await fs.writeFile(
      path.join(schemaPath, `v${flags.schema_version}-formatted.json`),
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
        --schema_version The semver string for the schema file located in public/common/schemas/ecs/
      `,
    },
  }
);
