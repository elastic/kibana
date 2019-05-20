/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore unconverted Elastic lib
import chrome from 'ui/chrome';
import { AxiosPromise } from 'axios';
// @ts-ignore unconverted local file
import { API_ROUTE_CUSTOM_ELEMENT } from '../../common/lib/constants';
// @ts-ignore unconverted local file
import { fetch } from '../../common/lib/fetch';
import { CustomElement } from './custom_element';

const basePath = chrome.getBasePath();
const apiPath = `${basePath}${API_ROUTE_CUSTOM_ELEMENT}`;

export const create = (customElement: CustomElement): AxiosPromise =>
  fetch.post(apiPath, customElement);

export const get = (customElementId: string): Promise<CustomElement> =>
  fetch
    .get(`${apiPath}/${customElementId}`)
    .then(({ data: element }: { data: CustomElement }) => element);

export const update = (id: string, element: CustomElement): AxiosPromise =>
  fetch.put(`${apiPath}/${id}`, element);

export const remove = (id: string): AxiosPromise => fetch.delete(`${apiPath}/${id}`);

export const find = async (
  searchTerm: string
): Promise<{ total: number; customElements: CustomElement[] }> => {
  const validSearchTerm = typeof searchTerm === 'string' && searchTerm.length > 0;

  return fetch
    .get(`${apiPath}/find?name=${validSearchTerm ? searchTerm : ''}&perPage=10000`)
    .then(
      ({ data: customElements }: { data: { total: number; customElements: CustomElement[] } }) =>
        customElements
    );
};
