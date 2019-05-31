/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { omit } from 'lodash';
import {
  CANVAS_TYPE,
  API_ROUTE_WORKPAD,
  API_ROUTE_WORKPAD_ASSETS,
  API_ROUTE_WORKPAD_STRUCTURES,
} from '../../common/lib/constants';
import { getId } from '../../public/lib/get_id';
import { formatResponse as formatRes } from '../lib/format_response';

export function workpad(server) {
  const { errors: esErrors } = server.plugins.elasticsearch.getCluster('data');
  const routePrefix = API_ROUTE_WORKPAD;
  const routePrefixAssets = API_ROUTE_WORKPAD_ASSETS;
  const routePrefixStructures = API_ROUTE_WORKPAD_STRUCTURES;
  const formatResponse = formatRes(esErrors);

  function createWorkpad(req) {
    const savedObjectsClient = req.getSavedObjectsClient();

    if (!req.payload) {
      return Promise.reject(boom.badRequest('A workpad payload is required'));
    }

    const now = new Date().toISOString();
    const { id, ...payload } = req.payload;
    return savedObjectsClient.create(
      CANVAS_TYPE,
      {
        ...payload,
        '@timestamp': now,
        '@created': now,
      },
      { id: id || getId('workpad') }
    );
  }

  function updateWorkpad(req, newPayload) {
    const savedObjectsClient = req.getSavedObjectsClient();
    const { id } = req.params;
    const payload = newPayload ? newPayload : req.payload;

    const now = new Date().toISOString();

    return savedObjectsClient.get(CANVAS_TYPE, id).then(workpad => {
      // TODO: Using create with force over-write because of version conflict issues with update
      return savedObjectsClient.create(
        CANVAS_TYPE,
        {
          ...workpad.attributes,
          ...omit(payload, 'id'), // never write the id property
          '@timestamp': now, // always update the modified time
          '@created': workpad.attributes['@created'], // ensure created is not modified
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
        .then(obj => {
          if (
            // not sure if we need to be this defensive
            obj.type === 'canvas-workpad' &&
            obj.attributes &&
            obj.attributes.pages &&
            obj.attributes.pages.length
          ) {
            obj.attributes.pages.forEach(page => {
              const elements = (page.elements || []).filter(({ id }) => !id.startsWith('group'));
              const groups = (page.groups || []).concat(
                (page.elements || []).filter(({ id }) => id.startsWith('group'))
              );
              page.elements = elements;
              page.groups = groups;
            });
          }
          return obj;
        })
        .then(obj => ({ id: obj.id, ...obj.attributes }))
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
      const payload = { assets: request.payload };
      return updateWorkpad(request, payload)
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
      return updateWorkpad(request)
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
            workpads: resp.saved_objects.map(hit => ({ id: hit.id, ...hit.attributes })),
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
