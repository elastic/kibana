/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'kibana/public';
import { KibanaPluginServiceFactory } from '../../../../../../src/plugins/presentation_util/public';

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
      const workpad = await coreStart.http.get<any>(`${getApiPath()}/${id}`);

      return { css: DEFAULT_WORKPAD_CSS, variables: [], ...workpad };
    },
    export: async (id: string) => {
      const workpad = await coreStart.http.get<SavedObject<CanvasWorkpad>>(
        `${getApiPath()}/export/${id}`
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
        `${getApiPath()}/resolve/${id}`
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
      });
    },
    import: (workpad: CanvasWorkpad) =>
      coreStart.http.post(`${getApiPath()}/import`, {
        body: JSON.stringify({
          ...sanitizeWorkpad({ ...workpad }),
          assets: workpad.assets || {},
          variables: workpad.variables || [],
        }),
      }),
    createFromTemplate: (templateId: string) => {
      return coreStart.http.post(getApiPath(), {
        body: JSON.stringify({ templateId }),
      });
    },
    findTemplates: async () => coreStart.http.get(API_ROUTE_TEMPLATES),
    find: (searchTerm: string) => {
      // TODO: this shouldn't be necessary.  Check for usage.
      const validSearchTerm = typeof searchTerm === 'string' && searchTerm.length > 0;

      return coreStart.http.get(`${getApiPath()}/find`, {
        query: {
          perPage: 10000,
          name: validSearchTerm ? searchTerm : '',
        },
      });
    },
    remove: (id: string) => {
      return coreStart.http.delete(`${getApiPath()}/${id}`);
    },
    update: (id, workpad) => {
      return coreStart.http.put(`${getApiPath()}/${id}`, {
        body: JSON.stringify({ ...sanitizeWorkpad({ ...workpad }) }),
      });
    },
    updateWorkpad: (id, workpad) => {
      return coreStart.http.put(`${API_ROUTE_WORKPAD_STRUCTURES}/${id}`, {
        body: JSON.stringify({ ...sanitizeWorkpad({ ...workpad }) }),
      });
    },
    updateAssets: (id, assets) => {
      return coreStart.http.put(`${API_ROUTE_WORKPAD_ASSETS}/${id}`, {
        body: JSON.stringify(assets),
      });
    },
    getRuntimeZip: (workpad) => {
      return coreStart.http.post<Blob>(API_ROUTE_SHAREABLE_ZIP, {
        body: JSON.stringify(workpad),
      });
    },
  };
};
