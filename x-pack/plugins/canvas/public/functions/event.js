/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const event = () => ({
  name: 'event',
  aliases: [],
  type: 'render',
  help: 'blah',
  context: {
    types: ['shape', 'null', 'pointseries', 'render'],
  },
  args: {
    trigger: {
      types: ['string'],
      help: 'The embeddable id',
      default: '',
    },
    action: {
      types: ['string'],
      help: 'action',
      default: '',
    },
  },
  fn: async (context, args) => {
    console.log('Event context is ', context);
    const events = (context && context.value.events) || [];
    events.push({
      trigger: args.trigger,
      action: args.action,
    });
    const ret = {
      ...context,
      value: {
        ...context.value,
        events,
      },
      type: 'render',
    };
    console.log('ret for event context is ', ret);
    return ret;
  },
});
