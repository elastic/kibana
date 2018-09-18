/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { populateServerRegistries } from '../populate_server_registries';
import { interpretProvider } from '../../../common/interpreter/interpret';
import { createHandlers } from '../create_handlers';

const pluginsReady = populateServerRegistries(['serverFunctions', 'types']);

export const server = ({ routeExpression }) => {
  return pluginsReady.then(({ serverFunctions, types }) => {
    return {
      interpret: async (ast, context) => {
        const interpret = interpretProvider({
          types: types.toJS(),
          functions: serverFunctions.toJS(),
          handlers: { environment: 'server' }, // TODO: Real handlers // Need server & request here
          onFunctionNotFound: (ast, context) => {
            return routeExpression(ast, context);
          },
        });

        return interpret(ast, context);
      },
      getFunctions: () => Object.keys(serverFunctions.toJS()),
    };
  });
};
