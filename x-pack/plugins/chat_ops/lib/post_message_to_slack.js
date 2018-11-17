/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import slack from './slack';

export default (server, to, text, params = {}) => {

  const config = server.config();
  const chattoken = config.get('xpack.chatops.chattoken');
  const name = config.get('xpack.chatops.chatname');

  return slack(server).chat.postMessage({
    chattoken,
    text,
    username: name,
    as_user: true,
    channel: to,
    ...params,
  });
};
