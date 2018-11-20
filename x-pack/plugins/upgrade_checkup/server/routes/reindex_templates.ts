/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'src/server/kbn_server';

export function registerReindexTemplateRoutes(server: Server) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');

  server.route({
    path: '/api/upgrade_checkup/reindex/command_template/{indexName}.json',
    method: 'GET',
    async handler(request) {
      const { indexName } = request.params;
      const newIndexName = `${indexName}-updated`;
      const indexInfo = await callWithRequest(request, 'transport.request', {
        path: `/${encodeURIComponent(indexName)}`,
      });

      // TODO: need to exclude some settings from this blob. (eg. uuid, created_date)
      const settings = indexInfo[indexName].settings;
      const mappings = indexInfo[indexName].mappings;

      return `
# create new index which we can re-index the data into

PUT /${newIndexName}
{
  "settings": ${stringify(settings, 2)},
  "mappings": ${stringify(mappings, 2)}
}

# WARNING: understand the possible issues with setting your
# index to read-only before performing this operation. You will
# want to ensure no data is actively being indexed. 

PUT ${indexName}/_settings
{
  "index.blocks.write": true
}

# Start the re-index process. For large indices might want to consider
# passing \`wait_for_completion: false\` and quering the tasks API to
# ensure it has completed before proceeding.

POST _reindex
{
  "source": { "index": "${indexName}" },
  "dest": { "index": "${newIndexName}" }
}

# once the re-index has completed and you have ensured the data
# integrity, you can create an alias with the name or your previous
# index and point it to the recently re-index alias. 

POST /_aliases
{
  "actions" : [
    { "add":  { "index": "${newIndexName}", "alias": "${indexName}" } },
    { "remove_index": { "index": "${indexName}" } }  
  ]
}
      `;
    },
  });
}

const stringify = (data: any, extraSpaces: number) => {
  const appendSpaces = (s: string) => {
    for (let i = 0; i < extraSpaces; i++) {
      s = ` ${s}`;
    }
    return s;
  };

  return JSON.stringify(data, undefined, 2)
    .split('\n')
    .map(appendSpaces)
    .join('\n')
    .trim();
};
