/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const cleanSettings = async (params: Record<string, any>) => {
  const getService = params.getService;
  const server = getService('kibanaServer');

  try {
    await server.savedObjects.clean({ types: ['uptime-dynamic-settings'] });
    await cleanConnectors(params);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
};

export const cleanConnectors = async (params: Record<string, any>) => {
  const getService = params.getService;
  const server = getService('kibanaServer');

  try {
    const { data } = await server.requester.request({
      path: '/api/actions/connectors',
      method: 'GET',
    });

    for (const connector of data) {
      await server.requester.request({
        path: `/api/actions/connector/${connector.id}`,
        method: 'DELETE',
      });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
};
