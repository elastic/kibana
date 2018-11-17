/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import client from '../lib/es_client';

export default (server) => ({
  help: 'List known stored commands',
  example: '',
  fn: () => {
    return client(server)
      .find({
        type: 'chatop',
      })
      .then(resp => {
        const commands = resp.saved_objects.map(hit => `*${hit.attributes.name}*`).sort();
        return `Here's the stored commands I know about: ${commands.join(', ')}`;
      })
      .catch(resp => resp.message);
  },
});
