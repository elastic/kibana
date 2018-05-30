/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { join, resolve } = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const { generate } = require('graphql-code-generator');

const GRAPHQL_GLOB = join('public', '**', '*.ts{,x}');
const CONFIG_PATH = resolve(__dirname, 'gql_gen.json');
const OUTPUT_PATH = resolve('common', 'domains', 'types.ts');
const SCHEMA_PATH = resolve('common', 'domains', 'all.gql_schema.ts');

async function main() {
  await generate(
    {
      args: [GRAPHQL_GLOB],
      config: CONFIG_PATH,
      out: OUTPUT_PATH,
      overwrite: true,
      require: ['ts-node/register'],
      schema: SCHEMA_PATH,
      template: 'graphql-codegen-typescript-template',
    },
    true
  );
}

if (require.main === module) {
  main();
}
