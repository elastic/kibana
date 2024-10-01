/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_ROUTE_CUSTOM_ELEMENT } from '../../common/lib';
import { CustomElement } from '../../types';
import { coreServices } from './kibana_services';

export interface CustomElementFindResponse {
  total: number;
  customElements: CustomElement[];
}

export interface CanvasCustomElementService {
  create: (customElement: CustomElement) => Promise<void>;
  get: (customElementId: string) => Promise<CustomElement>;
  update: (id: string, element: Partial<CustomElement>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  find: (searchTerm: string) => Promise<CustomElementFindResponse>;
}

export const getCustomElementService: () => CanvasCustomElementService = () => {
  const { http } = coreServices;
  const apiPath = `${API_ROUTE_CUSTOM_ELEMENT}`;

  return {
    create: (customElement) =>
      http.post(apiPath, { body: JSON.stringify(customElement), version: '1' }),
    get: (customElementId) =>
      http
        .get<{ data: CustomElement }>(`${apiPath}/${customElementId}`, { version: '1' })
        .then(({ data: element }) => element),
    update: (id, element) =>
      http.put(`${apiPath}/${id}`, { body: JSON.stringify(element), version: '1' }),
    remove: (id) => http.delete(`${apiPath}/${id}`, { version: '1' }),
    find: async (name) => {
      return http.get(`${apiPath}/find`, {
        query: {
          name,
          perPage: 10000,
        },
        version: '1',
      });
    },
  };
};
