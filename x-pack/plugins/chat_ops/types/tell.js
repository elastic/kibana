/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import postMessageToSlack from '../lib/post_message_to_slack';
import types from './index';

export default () => ({
  fn: (server, tellInput, message, handlers) => {
    const { to, from, output } = tellInput;

    try {
      const config = server.config();
      const name = config.get('xpack.chatops.chatname');

      const type = types[output.type];
      if (!type) throw new Error(`Unknown type returned from command: ${output.type}`);

      return postMessageToSlack(server,
        to,
        `Beep boop. I'm a bot and I have a message incoming from <@${from}>. Hold tight.
If you want to know more about me, type \`@${name} help\``
      )
        .then(() => {
          const tellHandlers = { ...handlers, getTo: () => to };
          return type(server).fn(output.value, message, tellHandlers);
        })
        .catch(e => {
          postMessageToSlack(server, from, `Tell failed: ${e.error}`);
        })
        .then(() => {
          postMessageToSlack(server, from, `Check, <@${to}> got the message. They got it real good.`);
        });
    } catch (e) {
      postMessageToSlack(server, from, `Tell failed: ${e.message}`);
    }
  },
});
