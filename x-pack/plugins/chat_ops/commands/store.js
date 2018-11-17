/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import client from '../lib/es_client';

export default (server) => ({
  help: 'Remember a command with a given name, and recall it with the `recall` command',
  example: 'store dashboard xxxx-xxxx-xxxx-xxxx',
  fn: (args, message) => {
    const parts = args.split(' ');
    const name = parts.shift();
    const command = parts.join(' ');

    if (!name || !command) throw new Error('Name and command are required');

    return client(server)
      .create("chatop", {
        name,
        command,
        owner: message.user,
        '@timestamp': new Date().toISOString(),
      })
      .then(
        () =>
          `Shortcut has been stored. You can get it back with \`@${server.config().get('xpack.chatops.chatname')} recall ${name}\``
      )
      .catch(err => {
        if (err.status === 409)
        {return `Oops, \`${name}\` already exists. Remove it with \`@${
          server.config().get('xpack.chatops.chatname')
        } remove ${name}\``;}
        return err.message;
      });
  },
});
