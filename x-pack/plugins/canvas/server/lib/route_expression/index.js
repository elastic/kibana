/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createError } from '../../../common/interpreter/create_error';

export const routeExpressionProvider = environments => {
  async function routeExpression(ast, context = null) {
    // List of environments in order of preference

    return Promise.all(environments).then(environments => {
      // This will likely need to be async also
      const environmentFunctions = environments.map(env => env.getFunctions());

      // Grab name of the first function in the chain
      const fnName = ast.chain[0].function.toLowerCase();

      // Check each environment for that function
      for (let i = 0; i < environmentFunctions.length; i++) {
        if (environmentFunctions[i].includes(fnName)) {
          // If we find it, run in that environment, and only that environment
          return environments[i].interpret(ast, context).catch(e => createError(e));
        }
      }

      // If the function isn't found in any environment, give up
      throw new Error(`Function not found: ${fnName}`);
    });
  }

  return routeExpression;
};
