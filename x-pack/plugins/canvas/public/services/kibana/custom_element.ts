/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaPluginServiceFactory } from '../../../../../../src/plugins/presentation_util/public';

import { API_ROUTE_CUSTOM_ELEMENT } from '../../../common/lib/constants';
import { CustomElement } from '../../../types';
import { CanvasStartDeps } from '../../plugin';
import { CanvasCustomElementService } from '../custom_element';

export type CanvasCustomElementServiceFactory = KibanaPluginServiceFactory<
  CanvasCustomElementService,
  CanvasStartDeps
>;

export const customElementServiceFactory: CanvasCustomElementServiceFactory = ({ coreStart }) => {
  const { http } = coreStart;
  const apiPath = `${API_ROUTE_CUSTOM_ELEMENT}`;

  return {
    create: (customElement) => http.post(apiPath, { body: JSON.stringify(customElement) }),
    get: (customElementId) =>
      http
        .get<{ data: CustomElement }>(`${apiPath}/${customElementId}`)
        .then(({ data: element }) => element),
    update: (id, element) => http.put(`${apiPath}/${id}`, { body: JSON.stringify(element) }),
    remove: (id) => http.delete(`${apiPath}/${id}`),
    find: async (name) => {
      return http.get(`${apiPath}/find`, {
        query: {
          name,
          perPage: 10000,
        },
      });
    },
  };
};
