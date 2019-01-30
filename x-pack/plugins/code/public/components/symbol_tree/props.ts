/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SymbolKind } from 'vscode-languageserver-types/lib/esm/main';
import { SymbolWithMembers } from '../../reducers/symbol';

export const props: { structureTree: SymbolWithMembers[] } = {
  structureTree: [
    {
      name: '"User"',
      kind: 2 as SymbolKind,
      location: {
        uri: 'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/src/models/User.ts',
        range: {
          start: {
            line: 0,
            character: 0,
          },
          end: {
            line: 93,
            character: 0,
          },
        },
      },
      path: '"User"',
      // @ts-ignore
      members: new Set([
        {
          name: 'AuthToken',
          kind: 13 as SymbolKind,
          location: {
            uri:
              'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/src/models/User.ts',
            range: {
              start: {
                line: 27,
                character: 0,
              },
              end: {
                line: 30,
                character: 2,
              },
            },
          },
          containerName: '"User"',
          path: '"User"/AuthToken',
        },
        {
          name: 'bcrypt',
          kind: 13 as SymbolKind,
          location: {
            uri:
              'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/src/models/User.ts',
            range: {
              start: {
                line: 0,
                character: 7,
              },
              end: {
                line: 0,
                character: 13,
              },
            },
          },
          containerName: '"User"',
          path: '"User"/bcrypt',
        },
        {
          name: 'comparePassword',
          kind: 14 as SymbolKind,
          location: {
            uri:
              'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/src/models/User.ts',
            range: {
              start: {
                line: 68,
                character: 6,
              },
              end: {
                line: 72,
                character: 1,
              },
            },
          },
          containerName: '"User"',
          path: '"User"/comparePassword',
        },
        {
          name: 'comparePasswordFunction',
          kind: 13 as SymbolKind,
          location: {
            uri:
              'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/src/models/User.ts',
            range: {
              start: {
                line: 25,
                character: 0,
              },
              end: {
                line: 25,
                character: 103,
              },
            },
          },
          containerName: '"User"',
          path: '"User"/comparePasswordFunction',
        },
        {
          name: 'crypto',
          kind: 13 as SymbolKind,
          location: {
            uri:
              'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/src/models/User.ts',
            range: {
              start: {
                line: 1,
                character: 7,
              },
              end: {
                line: 1,
                character: 13,
              },
            },
          },
          containerName: '"User"',
          path: '"User"/crypto',
        },
        {
          name: 'gravatar',
          kind: 12 as SymbolKind,
          location: {
            uri:
              'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/src/models/User.ts',
            range: {
              start: {
                line: 79,
                character: 30,
              },
              end: {
                line: 88,
                character: 1,
              },
            },
          },
          containerName: '"User"',
          path: '"User"/gravatar',
        },
        {
          name: 'mongoose',
          kind: 13 as SymbolKind,
          location: {
            uri:
              'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/src/models/User.ts',
            range: {
              start: {
                line: 2,
                character: 7,
              },
              end: {
                line: 2,
                character: 15,
              },
            },
          },
          containerName: '"User"',
          path: '"User"/mongoose',
        },
        {
          name: 'save',
          kind: 12 as SymbolKind,
          location: {
            uri:
              'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/src/models/User.ts',
            range: {
              start: {
                line: 55,
                character: 23,
              },
              end: {
                line: 66,
                character: 1,
              },
            },
          },
          containerName: '"User"',
          path: '"User"/save',
        },
        {
          name: 'User',
          kind: 14 as SymbolKind,
          location: {
            uri:
              'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/src/models/User.ts',
            range: {
              start: {
                line: 91,
                character: 6,
              },
              end: {
                line: 91,
                character: 47,
              },
            },
          },
          containerName: '"User"',
          path: '"User"/User',
        },
        {
          name: 'UserModel',
          kind: 13 as SymbolKind,
          location: {
            uri:
              'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/src/models/User.ts',
            range: {
              start: {
                line: 4,
                character: 0,
              },
              end: {
                line: 23,
                character: 2,
              },
            },
          },
          containerName: '"User"',
          path: '"User"/UserModel',
        },
        {
          name: 'userSchema',
          kind: 14 as SymbolKind,
          location: {
            uri:
              'git://github.com/Microsoft/TypeScript-Node-Starter/blob/4779cb7/src/models/User.ts',
            range: {
              start: {
                line: 32,
                character: 6,
              },
              end: {
                line: 50,
                character: 24,
              },
            },
          },
          containerName: '"User"',
          path: '"User"/userSchema',
        },
      ]),
    },
  ],
};
