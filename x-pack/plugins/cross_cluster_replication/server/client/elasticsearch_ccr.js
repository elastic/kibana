/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

export const elasticsearchJsPlugin = (Client, config, components) => {
  const ca = components.clientAction.factory;

  Client.prototype.ccr = components.clientAction.namespaceFactory();
  const ccr = Client.prototype.ccr.prototype;

  ccr.autoFollowPatterns = ca({
    urls: [
      {
        fmt: '/_ccr/auto_follow',
      }
    ],
    method: 'GET'
  });

  ccr.autoFollowPattern = ca({
    urls: [
      {
        fmt: '/_ccr/auto_follow/<%=id%>',
        req: {
          id: {
            type: 'string'
          }
        }
      }
    ],
    method: 'GET'
  });

  ccr.saveAutoFollowPattern = ca({
    urls: [
      {
        fmt: '/_ccr/auto_follow/<%=id%>',
        req: {
          id: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'PUT'
  });

  ccr.deleteAutoFollowPattern = ca({
    urls: [
      {
        fmt: '/_ccr/auto_follow/<%=id%>',
        req: {
          id: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'DELETE'
  });

  ccr.followerIndices = ca({
    urls: [
      {
        fmt: '/_ccr/stats',
      }
    ],
    method: 'GET'
  });

  ccr.followerIndex = ca({
    urls: [
      {
        fmt: '/<%=id%>/_ccr/stats',
        req: {
          id: {
            type: 'string'
          }
        }
      }
    ],
    method: 'GET'
  });

  ccr.saveFollowerIndex = ca({
    urls: [
      {
        fmt: '/<%=name%>/_ccr/follow',
        req: {
          name: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'PUT'
  });
};
