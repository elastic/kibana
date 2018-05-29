/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const ROOT = '/api/gis';


export function initRoutes(server) {

  server.route({
    method: 'GET',
    path: `${ROOT}/foobar`,
    handler: async (req, reply) => {
      const savedObjectsClient = req.getSavedObjectsClient();
      try {
        const ret = await savedObjectsClient.create('gis-app', {
          "description": "foobar",
          "title": "also foobar",
          "version": 1
        }, {});
        reply(ret);
      } catch (e) {
        throw e;
      }
    }
  });
  server.route({
    method: 'GET',
    path: `${ROOT}/app`,
    handler: async (req, reply) => {
      reply({});
    }
  });

}
