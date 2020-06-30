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
  join('public', '**', '*.gql_query.ts{,x}'),
  join('common', 'graphql', '**', '*.gql_query.ts{,x}'),
];
const OUTPUT_INTROSPECTION_PATH = resolve('public', 'graphql', 'introspection.json');
const OUTPUT_CLIENT_TYPES_PATH = resolve('public', 'graphql', 'types.ts');
const OUTPUT_SERVER_TYPES_PATH = resolve('server', 'graphql', 'types.ts');
const SCHEMA_PATH = resolve(__dirname, 'combined_schema.ts');

async function main() {
  await generate(
    {
      schema: SCHEMA_PATH,
      overwrite: true,
      generates: {
        [OUTPUT_INTROSPECTION_PATH]: {
          documents: GRAPHQL_GLOBS,
          primitives: {
            String: 'string',
            Int: 'number',
            Float: 'number',
            Boolean: 'boolean',
            ID: 'string',
          },
          config: {
            namingConvention: {
              typeNames: 'change-case#pascalCase',
              enumValues: 'keep',
            },
            contextType: 'SiemContext',
            scalars: {
              ToStringArray: 'string[] | string',
              ToNumberArray: 'number[] | number',
              ToDateArray: 'string[] | string',
              ToBooleanArray: 'boolean[] | boolean',
              Date: 'string',
            },
          },
          plugins: ['introspection'],
        },
        [OUTPUT_CLIENT_TYPES_PATH]: {
          documents: GRAPHQL_GLOBS,
          primitives: {
            String: 'string',
            Int: 'number',
            Float: 'number',
            Boolean: 'boolean',
            ID: 'string',
          },
          config: {
            avoidOptionals: false,
            namingConvention: {
              typeNames: 'change-case#pascalCase',
              enumValues: 'keep',
            },
            contextType: 'SiemContext',
            scalars: {
              ToStringArray: 'string[]',
              ToNumberArray: 'number[]',
              ToDateArray: 'string[]',
              ToBooleanArray: 'boolean[]',
              Date: 'string',
            },
          },
          plugins: [
            {
              add: `/* tslint:disable */
                    /* eslint-disable */
                    /*
                    * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
                    * or more contributor license agreements. Licensed under the Elastic License;
                    * you may not use this file except in compliance with the Elastic License.
                    */
                  `,
            },
            'typescript-common',
            'typescript-server',
            'typescript-client',
          ],
        },
        [OUTPUT_SERVER_TYPES_PATH]: {
          primitives: {
            String: 'string',
            Int: 'number',
            Float: 'number',
            Boolean: 'boolean',
            ID: 'string',
          },
          config: {
            avoidOptionals: false,
            namingConvention: {
              typeNames: 'change-case#pascalCase',
              enumValues: 'keep',
            },
            contextType: 'SiemContext',
            scalars: {
              ToStringArray: 'string[] | string',
              ToNumberArray: 'number[] | number',
              ToDateArray: 'string[] | string',
              ToBooleanArray: 'boolean[] | boolean',
              Date: 'string',
            },
          },
          plugins: [
            {
              add: `
                /* tslint:disable */
                /* eslint-disable */
                /*
                * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
                * or more contributor license agreements. Licensed under the Elastic License;
                * you may not use this file except in compliance with the Elastic License.
                */

                import { SiemContext } from '../lib/types';
                `,
            },
            'typescript-common',
            'typescript-server',
            'typescript-resolvers',
          ],
        },
      },
    },
    true
  );
}

if (require.main === module) {
  main();
}
