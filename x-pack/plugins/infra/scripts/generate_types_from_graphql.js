/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('../../../../src/setup_node_env');

const { join, resolve } = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies, import/no-unresolved
const { generate } = require('graphql-code-generator');

const GRAPHQL_GLOBS = [
  join('public', 'containers', '**', '*.gql_query.ts{,x}'),
  join('public', 'store', '**', '*.gql_query.ts{,x}'),
  join('common', 'graphql', '**', '*.gql_query.ts{,x}'),
];
const CLIENT_CONFIG_PATH = resolve(__dirname, 'gql_gen_client.json');
const SERVER_CONFIG_PATH = resolve(__dirname, 'gql_gen_server.json');
const OUTPUT_INTROSPECTION_PATH = resolve('public', 'graphql', 'introspection.json');
const OUTPUT_CLIENT_TYPES_PATH = resolve('public', 'graphql', 'types.ts');
const OUTPUT_COMMON_TYPES_PATH = resolve('common', 'graphql', 'types.ts');
const OUTPUT_SERVER_TYPES_PATH = resolve('server', 'graphql', 'types.ts');
const SCHEMA_PATH = resolve(__dirname, 'combined_schema.ts');

async function main() {
  await generate(
    {
      args: GRAPHQL_GLOBS,
      config: SERVER_CONFIG_PATH,
      out: OUTPUT_INTROSPECTION_PATH,
      overwrite: true,
      schema: SCHEMA_PATH,
      template: 'graphql-codegen-introspection-template',
    },
    true
  );
  await generate(
    {
      args: GRAPHQL_GLOBS,
      config: CLIENT_CONFIG_PATH,
      out: OUTPUT_CLIENT_TYPES_PATH,
      overwrite: true,
      schema: SCHEMA_PATH,
      template: 'graphql-codegen-typescript-template',
    },
    true
  );
  await generate(
    {
      args: GRAPHQL_GLOBS,
      config: CLIENT_CONFIG_PATH,
      out: OUTPUT_COMMON_TYPES_PATH,
      overwrite: true,
      schema: SCHEMA_PATH,
      template: 'graphql-codegen-typescript-template',
    },
    true
  );
  await generate(
    {
      args: [],
      config: SERVER_CONFIG_PATH,
      out: OUTPUT_SERVER_TYPES_PATH,
      overwrite: true,
      schema: SCHEMA_PATH,
      template: 'graphql-codegen-typescript-resolvers-template',
    },
    true
  );
}

if (require.main === module) {
  main();
}
