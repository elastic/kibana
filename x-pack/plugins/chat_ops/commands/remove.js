/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import client from '../lib/es_client';

export default (server) => ({
  help: 'Remove a command that has been stored with `store`',
  example: 'myCommand',
  fn: args => {
    const name = args.trim();
    let docid = '';

    if (!name) throw new Error('Stored command name is required');

    return client(server)
      .find({
        type: "chatop",
        search: name,
        perPage: 10000,
        searchFields: ['name']
      })
      .then(doc => {
        if (doc.saved_objects.length === 0) {
          return `The stored command \`${name}\` could not be found.`;
        }
        const indexPatternSavedObject = doc.saved_objects.find(savedObject => {
          return savedObject.attributes.name === name;
        });
        if (!indexPatternSavedObject) {
          // index argument does not match the name
          return `The stored command \`${name}\` could not be found.`;
        }
        docid = indexPatternSavedObject.id;
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
