/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import slack from './slack';

export async function uploadToSlack(server, options) {
  const config = server.config();
  const chattoken = config.get('xpack.chatops.chattoken');

  const payload = { ...options, token: chattoken };
  return await slack(server).files.upload(payload);
}
