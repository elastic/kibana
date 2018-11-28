/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable import/no-extraneous-dependencies */
import run from './run';
import types from './types';
import postMessageToSlack from './lib/post_message_to_slack';
import { RTMClient, WebClient } from '@slack/client';

export function chatbot(server) {
  const config = server.config();

  const chattoken = config.get('xpack.chatops.chattoken');
  const name = config.get('xpack.chatops.chatname');

  // The client is initialized and then started to get an active connection to the platform
  const inputBot = new RTMClient(chattoken);
  inputBot.start();

  inputBot.on('connecting', () => {
    console.log(`${name} connecting`);
  });

  inputBot.on('authenticated', () => {
    console.log(`${name} authenticated successfully`);
  });

  inputBot.on('connected', () => {
    console.log(`${name} connected successfully`);
  });

  inputBot.on('error', (error) => {
    console.log(`${name} returned an error. ` + error.code);
  });

  inputBot.on('unable_to_rtm_start', () => {
    console.log(`${name} was unabnle to start`);
  });

  inputBot.on('close', () => {
    console.log(`${name} disconected`);
  });

  inputBot.on('message', function (message) {
    // all ingoing events https://api.slack.com/rtm
    const { text, user, channel } = message;

    if (!text) return;

    const id = inputBot.activeUserId;

    const match = new RegExp(`<@${id}>`);

    if (!text.match(match)) return;

    const handlers = {
      getTo: () => channel,
    };

    const input = text.split(match)[1].trim();
    const webbot = new WebClient(chattoken);

    const timeout1 = setTimeout(() => {
      webbot.chat.postEphemeral({ channel, text: 'Ok, working on it. Give me a few moments', user, token: chattoken });
    }, 2000);

    const timeout2 = setTimeout(() => {
      webbot.chat.postEphemeral({
        channel,
        user,
        text: 'Sometimes report images take awhile, sorry about that.',
        token: chattoken }
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
}