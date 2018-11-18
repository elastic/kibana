/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import client from '../lib/es_client';

export default (server) => ({
  help: 'Show the text of a stored command',
  example: 'mycommand',
  fn: args => {
    const name = args.trim();

    if (!name) throw new Error('Stored shortcut name is required');

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
        return `Here's what I found for \`${name}\`: 

\`\`\`
${indexPatternSavedObject.attributes.command}
\`\`\``;
      })
      .catch(resp => resp.message);
  },
});
