/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const elasticsearchJsPlugin = (Client: any, config: any, components: any) => {
  const ca = components.clientAction.factory;

  Client.prototype.dataManagement = components.clientAction.namespaceFactory();
  const dataManagement = Client.prototype.dataManagement.prototype;

  // Component templates
  dataManagement.getComponentTemplates = ca({
    urls: [
      {
        fmt: '/_component_template',
      },
    ],
    method: 'GET',
  });

  dataManagement.getComponentTemplate = ca({
    urls: [
      {
        fmt: '/_component_template/<%=name%>',
        req: {
          name: {
            type: 'string',
          },
        },
      },
    ],
    method: 'GET',
  });

  dataManagement.saveComponentTemplate = ca({
    urls: [
      {
        fmt: '/_component_template/<%=name%>',
        req: {
          name: {
            type: 'string',
          },
        },
      },
    ],
    method: 'PUT',
  });

  dataManagement.deleteComponentTemplate = ca({
    urls: [
      {
        fmt: '/_component_template/<%=name%>',
        req: {
          name: {
            type: 'string',
          },
        },
      },
    ],
    method: 'DELETE',
  });

  // Composable index templates
  dataManagement.getComposableIndexTemplates = ca({
    urls: [
      {
        fmt: '/_index_template',
      },
    ],
    method: 'GET',
  });
};
