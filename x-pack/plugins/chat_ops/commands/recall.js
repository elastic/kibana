/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import client from '../lib/es_client';
import run from '../run';

export default (server) => ({
  help: 'Run a command that has been stored with `store`',
  example: 'mycommand',
  fn: (args, message, handlers) => {
    const name = args.trim();

    if (!name) throw new Error('name is required');

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
        return run(indexPatternSavedObject.attributes.command, message, handlers, server);
      })
      .catch(resp => resp.message);
  },
});
