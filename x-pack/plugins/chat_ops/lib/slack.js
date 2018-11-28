/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable import/no-extraneous-dependencies */
import { RTMClient } from '@slack/client';

export default (server) => {
  const config = server.config();
  const chattoken = config.get('xpack.chatops.chattoken');
  const inputBot = new RTMClient(chattoken);
  inputBot.start();

  return inputBot;
};
