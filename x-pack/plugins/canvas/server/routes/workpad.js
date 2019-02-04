/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import {
  CANVAS_TYPE,
  API_ROUTE_WORKPAD,
  API_ROUTE_WORKPAD_ASSETS,
  API_ROUTE_WORKPAD_STRUCTURES,
} from '../../common/lib/constants';
import { getId } from '../../public/lib/get_id';

export function workpad(server) {
  //const config = server.config();
  const { errors: esErrors } = server.plugins.elasticsearch.getCluster('data');
  const routePrefix = API_ROUTE_WORKPAD;
  const routePrefixAssets = API_ROUTE_WORKPAD_ASSETS;
  const routePrefixStructures = API_ROUTE_WORKPAD_STRUCTURES;

  function formatResponse(resp) {
    if (resp.isBoom) {
      return resp;
    } // can't wrap it if it's already a boom error

    if (resp instanceof esErrors['400']) {
      return boom.badRequest(resp);
    }

    if (resp instanceof esErrors['401']) {
      return boom.unauthorized();
    }

    if (resp instanceof esErrors['403']) {
      return boom.forbidden("Sorry, you don't have access to that");
    }

    if (resp instanceof esErrors['404']) {
      return boom.boomify(resp, { statusCode: 404 });
    }

    return resp;
  }

  function createWorkpad(req, id) {
    const savedObjectsClient = req.getSavedObjectsClient();

    if (!req.payload) {
      return Promise.reject(boom.badRequest('A workpad payload is required'));
    }

    const now = new Date().toISOString();
    return savedObjectsClient.create(
      CANVAS_TYPE,
      {
        ...req.payload,
        '@timestamp': now,
        '@created': now,
      },
      { id: id || req.payload.id || getId('workpad') }
    );
  }

  function updateWorkpad(req) {
    const savedObjectsClient = req.getSavedObjectsClient();
    const { id } = req.params;

    const now = new Date().toISOString();

    return savedObjectsClient.get(CANVAS_TYPE, id).then(workpad => {
      // TODO: Using create with force over-write because of version conflict issues with update
      return savedObjectsClient.create(
        CANVAS_TYPE,
        {
          ...req.payload,
          '@timestamp': now,
          '@created': workpad.attributes['@created'],
        },
        { overwrite: true, id }
      );
    });
  }

  function updateWorkpadAssets(req) {
    const savedObjectsClient = req.getSavedObjectsClient();
    const { id } = req.params;

    const now = new Date().toISOString();

    return savedObjectsClient.get(CANVAS_TYPE, id).then(workpad => {
      // TODO: Using create with force over-write because of version conflict issues with update
      return savedObjectsClient.create(
        CANVAS_TYPE,
        {
          ...workpad.attributes,
          assets: req.payload,
          '@timestamp': now,
          '@created': workpad.attributes['@created'],
        },
        { overwrite: true, id }
      );
    });
  }

  function updateWorkpadStructures(req) {
    const savedObjectsClient = req.getSavedObjectsClient();
    const { id } = req.params;

    const now = new Date().toISOString();

    return savedObjectsClient.get(CANVAS_TYPE, id).then(workpad => {
      // TODO: Using create with force over-write because of version conflict issues with update
      return savedObjectsClient.create(
        CANVAS_TYPE,
        {
          ...workpad.attributes, // retain preexisting assets and prop order (or maybe better to call out the `assets` prop?)
          ...req.payload,
          '@timestamp': now,
          '@created': workpad.attributes['@created'],
        },
        { overwrite: true, id }
      );
    });
  }

  function deleteWorkpad(req) {
    const savedObjectsClient = req.getSavedObjectsClient();
    const { id } = req.params;

    return savedObjectsClient.delete(CANVAS_TYPE, id);
  }

  function findWorkpad(req) {
    const savedObjectsClient = req.getSavedObjectsClient();
    const { name, page, perPage } = req.query;

    return savedObjectsClient.find({
      type: CANVAS_TYPE,
      sortField: '@timestamp',
      sortOrder: 'desc',
      search: name ? `${name}* | ${name}` : '*',
      searchFields: ['name'],
      fields: ['id', 'name', '@created', '@timestamp'],
      page,
      perPage,
    });
  }

  // get workpad
  server.route({
    method: 'GET',
    path: `${routePrefix}/{id}`,
    handler: function(req) {
      const savedObjectsClient = req.getSavedObjectsClient();
      const { id } = req.params;

      return savedObjectsClient
        .get(CANVAS_TYPE, id)
        .then(obj => obj.attributes)
        .then(formatResponse)
        .catch(formatResponse);
    },
  });

  // create workpad
  server.route({
    method: 'POST',
    path: routePrefix,
    config: { payload: { allow: 'application/json', maxBytes: 26214400 } }, // 25MB payload limit
    handler: function(request) {
      return createWorkpad(request)
        .then(() => ({ ok: true }))
        .catch(formatResponse);
    },
  });

  // update workpad
  server.route({
    method: 'PUT',
    path: `${routePrefix}/{id}`,
    config: { payload: { allow: 'application/json', maxBytes: 26214400 } }, // 25MB payload limit
    handler: function(request) {
      return updateWorkpad(request)
        .then(() => ({ ok: true }))
        .catch(formatResponse);
    },
  });

  // update workpad assets
  server.route({
    method: 'PUT',
    path: `${routePrefixAssets}/{id}`,
    config: { payload: { allow: 'application/json', maxBytes: 26214400 } }, // 25MB payload limit
    handler: function(request) {
      return updateWorkpadAssets(request)
        .then(() => ({ ok: true }))
        .catch(formatResponse);
    },
  });

  // update workpad structures
  server.route({
    method: 'PUT',
    path: `${routePrefixStructures}/{id}`,
    config: { payload: { allow: 'application/json', maxBytes: 26214400 } }, // 25MB payload limit
    handler: function(request) {
      return updateWorkpadStructures(request)
        .then(() => ({ ok: true }))
        .catch(formatResponse);
    },
  });

  // delete workpad
  server.route({
    method: 'DELETE',
    path: `${routePrefix}/{id}`,
    handler: function(request) {
      return deleteWorkpad(request)
        .then(() => ({ ok: true }))
        .catch(formatResponse);
    },
  });

  // find workpads
  server.route({
    method: 'GET',
    path: `${routePrefix}/find`,
    handler: function(request) {
      return findWorkpad(request)
        .then(formatResponse)
        .then(resp => {
          return {
            total: resp.total,
            workpads: resp.saved_objects.map(hit => hit.attributes),
          };
        })
        .catch(() => {
          return {
            total: 0,
            workpads: [],
          };
        });
    },
  });
}
