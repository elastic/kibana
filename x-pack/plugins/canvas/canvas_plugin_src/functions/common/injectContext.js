/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const injectContext = () => ({
  name: 'injectContext',
  aliases: [],
  args: {
    key: {
      type: 'string',
    },
    value: {
      type: 'string',
    },
  },
  fn(context, args) {
    console.log('injectContext context is:', context);
    const ret = {
      type: 'any',
      value: {
        ...context.value,
        [args.key]: args.value,
      },
    };
    console.log('injectContext ret is:', ret);
    return ret;
  },
});
