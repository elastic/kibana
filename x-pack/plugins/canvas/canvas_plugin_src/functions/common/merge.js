/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const merge = () => ({
  name: 'merge',
  aliases: [],
  args: {
    fn: {
      type: 'function',
    },
  },
  fn(context, args) {
    console.log('merge context is:', context);
    const ret = {
      type: 'any',
      value: {
        ...context.value,
        ...args.fn.value,
      },
    };
    console.log('merge ret is:', ret);
    return ret;
  },
});
