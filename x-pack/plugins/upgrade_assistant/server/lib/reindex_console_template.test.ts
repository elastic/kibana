/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getReindexTemplate } from './reindex_console_template';

describe('getReindexTemplate', () => {
  it('works', async () => {
    const callWithRequest = jest.fn().mockResolvedValue({
      myIndex: {
        settings: {
          // These settings should get preserved.
          'index.number_of_replicas': '0',
          'index.number_of_shards': '1',
          // These settings will be removed in the snapshot.
          'index.uuid': '123123',
          'index.creation_date': '123123123',
          'index.version.created': '7000',
          'index.provided_name': 'myIndex',
        },
        mappings: {
          properties: {
            '@message': {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
          },
        },
      },
    });

    expect(await getReindexTemplate(callWithRequest, {} as any, 'myIndex')).toMatchInlineSnapshot(`
"
# create new index which we can re-index the data into

PUT /myIndex-updated
{
  \\"settings\\": {
    \\"index.number_of_replicas\\": \\"0\\",
    \\"index.number_of_shards\\": \\"1\\"
  },
  \\"mappings\\": {
    \\"properties\\": {
      \\"@message\\": {
        \\"type\\": \\"text\\",
        \\"fields\\": {
          \\"keyword\\": {
            \\"type\\": \\"keyword\\",
            \\"ignore_above\\": 256
          }
        }
      }
    }
  }
}

# WARNING: understand the possible issues with setting your
# index to read-only before performing this operation. You will
# want to ensure no data is actively being indexed. 

PUT myIndex/_settings
{
  \\"index.blocks.write\\": true
}

# Start the re-index process. For large indices might want to consider
# passing \`wait_for_completion: false\` and quering the tasks API to
# ensure it has completed before proceeding.

POST _reindex
{
  \\"source\\": { \\"index\\": \\"myIndex\\" },
  \\"dest\\": { \\"index\\": \\"myIndex-updated\\" }
}

# once the re-index has completed and you have ensured the data
# integrity, you can create an alias with the name or your previous
# index and point it to the recently re-index alias. 

POST /_aliases
{
  \\"actions\\" : [
    { \\"add\\":  { \\"index\\": \\"myIndex-updated\\", \\"alias\\": \\"myIndex\\" } },
    { \\"remove_index\\": { \\"index\\": \\"myIndex\\" } }  
  ]
}
      "
`);
  });
});
