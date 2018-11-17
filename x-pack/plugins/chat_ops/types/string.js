/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import postMessageToSlack from '../lib/post_message_to_slack';

export default () => ({
  fn: (server, output, message, handlers) => postMessageToSlack(server, handlers.getTo(), output),
});
