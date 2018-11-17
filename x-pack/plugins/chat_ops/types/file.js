/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { uploadToSlack } from '../lib/upload_to_slack';

export default () => ({
  fn: (server, output, message, handlers) => {
    return uploadToSlack(server, {
      ...output,
      channels: handlers.getTo(),
    });
  },
});
