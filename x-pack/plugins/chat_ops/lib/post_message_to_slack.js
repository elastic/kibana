/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import slack from './slack';

export default (server, to, text) => {

  // The RTM client can send simple string messages
  slack(server).sendMessage(text, to)
    .catch(console.error);

};
