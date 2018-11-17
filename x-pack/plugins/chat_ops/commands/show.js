/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import client from '../lib/es_client';

export default (server) => ({
  help: 'Show the text of a stored command',
  example: 'show mycommand',
  fn: args => {
    const name = args.trim();

    if (!name) throw new Error('Stored shortcut name is required');

    return client(server)
      .find({
        type: 'chatop',
        name: name,
      })
      .then(doc => {
        return `Here's what I found for \`${name}\`: 

\`\`\`
${doc.saved_objects[0].attributes.command}
\`\`\``;
      })
      .catch(resp => resp.message);
  },
});
