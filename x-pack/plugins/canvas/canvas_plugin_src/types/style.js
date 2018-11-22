/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const style = () => ({
  name: 'style',
  from: {
    null: () => {
      return {
        type: 'style',
        spec: {},
        css: '',
      };
    },
  },
});
