/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

export const elasticsearchJsPlugin = (Client, config, components) => {
  const ca = components.clientAction.factory;

  Client.prototype.rollup = components.clientAction.namespaceFactory();
  const rollup = Client.prototype.rollup.prototype;

  rollup.capabilitiesByRollupIndex = ca({
    urls: [
      {
        fmt: '<%=indexPattern%>/_xpack/rollup/data',
        req: {
          indexPattern: {
            type: 'string'
          }
        }
      }
    ],
    method: 'GET'
  });

  rollup.capabilitiesByIndex = ca({
    urls: [
      {
        fmt: '/_xpack/rollup/data/<%=indices%>',
        req: {
          indices: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_xpack/rollup/data/',
      }
    ],
    method: 'GET'
  });

  rollup.search = ca({
    urls: [
      {
        fmt: '/<%=index%>/_rollup_search',
        req: {
          index: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'POST'
  });
};

