/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable import/no-extraneous-dependencies */
import Slackbot from 'slackbots';
import run from './run';
import types from './types';
import postMessageToSlack from './lib/post_message_to_slack';

export function chatbot(server) {
  const config = server.config();

  const chattoken = config.get('xpack.chatops.chattoken');
  const name = config.get('xpack.chatops.chatname');

  // create a bot
  const inputBot = new Slackbot({ token: chattoken, name });

  inputBot.on('open', () => {
    console.log(`${name} started successfully`);
    //poll();

  });

  inputBot.on('close', () => {
    console.log(`${name} disconected`);
  });

  inputBot.getUser(name).then(me => {
    const { id } = me;

    inputBot.on('message', function (message) {
    // all ingoing events https://api.slack.com/rtm
      const { text, user, channel } = message;
      if (!text) return;

      const match = new RegExp(`^<@${id}>`);
      if (!text.match(match)) return;

      const handlers = {
        getTo: () => channel,
      };

      const input = text.split(match)[1].trim();

      const timeout1 = setTimeout(() => {
        inputBot.postEphemeral(channel, user, 'Ok, working on it. Give me a few moments here');
      }, 2000);

      const timeout2 = setTimeout(() => {
        inputBot.postEphemeral(
          channel,
          user,
          'Sometimes report images take awhile, sorry about that.'
        );
      }, 8000);

      const done = () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
      };

      Promise.resolve(
        run(input, message, handlers, server).then(output => {
          const type = types[output.type];
          if (!type) throw new Error(`Unknown type returned from command: ${output.type}`);

          return type().fn(server, output.value, message, handlers);
        })
      )
        .then(done)
        .catch(e => {
          done();
          postMessageToSlack(server, channel, `COMMAND FAILED: \`${e.message}\``);
        });
    });
  });
}