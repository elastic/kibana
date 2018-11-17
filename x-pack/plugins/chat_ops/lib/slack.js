/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable import/no-extraneous-dependencies */
import Slack from 'slack';

export default (server) => {
  const config = server.config();
  const token = config.get('xpack.chatops.chattoken');

  const slack = new Slack({ token });
  return slack;
};
