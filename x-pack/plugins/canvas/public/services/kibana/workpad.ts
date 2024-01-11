/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/public';
import { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';

import { CanvasStartDeps } from '../../plugin';
import { CanvasWorkpadService, ResolveWorkpadResponse } from '../workpad';

import {
  API_ROUTE_WORKPAD,
  DEFAULT_WORKPAD_CSS,
  API_ROUTE_TEMPLATES,
  API_ROUTE_WORKPAD_ASSETS,
  API_ROUTE_WORKPAD_STRUCTURES,
  API_ROUTE_SHAREABLE_ZIP,
} from '../../../common/lib/constants';
import { CanvasWorkpad } from '../../../types';

export type CanvasWorkpadServiceFactory = KibanaPluginServiceFactory<
  CanvasWorkpadService,
  CanvasStartDeps
>;

/*
  Remove any top level keys from the workpad which will be rejected by validation
*/
const validKeys = [
  '@created',
  '@timestamp',
  'assets',
  'colors',
  'css',
  'variables',
  'height',
  'id',
  'isWriteable',
  'name',
  'page',
  'pages',
  'width',
];

const sanitizeWorkpad = function (workpad: CanvasWorkpad) {
  const workpadKeys = Object.keys(workpad);

  for (const key of workpadKeys) {
    if (!validKeys.includes(key)) {
      delete (workpad as { [key: string]: any })[key];
    }
  }

  return workpad;
};

export const workpadServiceFactory: CanvasWorkpadServiceFactory = ({ coreStart, startPlugins }) => {
  const getApiPath = function () {
    return `${API_ROUTE_WORKPAD}`;
  };

  return {
    get: async (id: string) => {
      const workpad = await coreStart.http.get<any>(`${getApiPath()}/${id}`, { version: '1' });

      return { css: DEFAULT_WORKPAD_CSS, variables: [], ...workpad };
    },
    export: async (id: string) => {
      const workpad = await coreStart.http.get<SavedObject<CanvasWorkpad>>(
        `${getApiPath()}/export/${id}`,
        { version: '1' }
      );
      const { attributes } = workpad;

      return {
        ...workpad,
        attributes: {
          ...attributes,
          css: attributes.css ?? DEFAULT_WORKPAD_CSS,
          variables: attributes.variables ?? [],
        },
      };
    },
    resolve: async (id: string) => {
      const { workpad, ...resolveProps } = await coreStart.http.get<ResolveWorkpadResponse>(
        `${getApiPath()}/resolve/${id}`,
        { version: '1' }
      );

      return {
        ...resolveProps,
        workpad: {
          // @ts-ignore: Shimming legacy workpads that might not have CSS
          css: DEFAULT_WORKPAD_CSS,
          // @ts-ignore: Shimming legacy workpads that might not have variables
          variables: [],
          ...workpad,
        },
      };
    },
    create: (workpad: CanvasWorkpad) => {
      return coreStart.http.post(getApiPath(), {
        body: JSON.stringify({
          ...sanitizeWorkpad({ ...workpad }),
          assets: workpad.assets || {},
          variables: workpad.variables || [],
        }),
        version: '1',
      });
    },
    import: (workpad: CanvasWorkpad) =>
      coreStart.http.post(`${getApiPath()}/import`, {
        body: JSON.stringify({
          ...sanitizeWorkpad({ ...workpad }),
          assets: workpad.assets || {},
          variables: workpad.variables || [],
        }),
        version: '1',
      }),
    createFromTemplate: (templateId: string) => {
      return coreStart.http.post(getApiPath(), {
        body: JSON.stringify({ templateId }),
        version: '1',
      });
    },
    findTemplates: async () => coreStart.http.get(API_ROUTE_TEMPLATES, { version: '1' }),
    find: (searchTerm: string) => {
      // TODO: this shouldn't be necessary.  Check for usage.
      const validSearchTerm = typeof searchTerm === 'string' && searchTerm.length > 0;

      return coreStart.http.get(`${getApiPath()}/find`, {
        query: {
          perPage: 10000,
          name: validSearchTerm ? searchTerm : '',
        },
        version: '1',
      });
    },
    remove: (id: string) => {
      return coreStart.http.delete(`${getApiPath()}/${id}`, { version: '1' });
    },
    update: (id, workpad) => {
      return coreStart.http.put(`${getApiPath()}/${id}`, {
        body: JSON.stringify({ ...sanitizeWorkpad({ ...workpad }) }),
        version: '1',
      });
    },
    updateWorkpad: (id, workpad) => {
      return coreStart.http.put(`${API_ROUTE_WORKPAD_STRUCTURES}/${id}`, {
        body: JSON.stringify({ ...sanitizeWorkpad({ ...workpad }) }),
        version: '1',
      });
    },
    updateAssets: (id, assets) => {
      return coreStart.http.put(`${API_ROUTE_WORKPAD_ASSETS}/${id}`, {
        body: JSON.stringify(assets),
        version: '1',
      });
    },
    getRuntimeZip: (workpad) => {
      return coreStart.http.post<Blob>(API_ROUTE_SHAREABLE_ZIP, {
        body: JSON.stringify(workpad),
        version: '1',
      });
    },
  };
};
