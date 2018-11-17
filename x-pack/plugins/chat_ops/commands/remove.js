/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import client from '../lib/es_client';

export default (server) => ({
  help: 'Remove a command that has been stored with `store`',
  example: 'remove myCommand',
  fn: args => {
    const name = args.trim();
    let docid = '';

    if (!name) throw new Error('Stored command name is required');

    return client(server)
      .find({
        type: 'chatop',
        name: name,
      })
      .then(doc => {
        docid = doc.saved_objects[0].id;
        return client(server)
          .delete("chatop",
            docid,
          )
          .then(() => `The stored command \`${name}\` has been removed.`)
          .catch(resp => resp.message);
      })
      .catch(resp => resp.message);
  }
});
