/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const error = () => ({
  name: 'error',
  to: {
    render: input => {
      const { error, info } = input;
      return {
        type: 'render',
        as: 'error',
        value: {
          error,
          info,
        },
      };
    },
  },
});
