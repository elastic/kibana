/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_ROUTE_WORKPAD, DEFAULT_WORKPAD_CSS } from '../../common/lib/constants';
import { CanvasWorkpad } from '../../types';
import { CanvasServiceFactory } from './';

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

interface WorkpadFindResponse {
  total: number;
  workpads: Array<Pick<CanvasWorkpad, 'name' | 'id' | '@timestamp' | '@created'>>;
}

export interface WorkpadService {
  get: (id: string) => Promise<CanvasWorkpad>;
  create: (workpad: CanvasWorkpad) => Promise<CanvasWorkpad>;
  createFromTemplate: (templateId: string) => Promise<CanvasWorkpad>;
  find: (term: string) => Promise<WorkpadFindResponse>;
  remove: (id: string) => Promise<void>;
}

export const workpadServiceFactory: CanvasServiceFactory<WorkpadService> = (
  _coreSetup,
  coreStart,
  _setupPlugins,
  startPlugins
): WorkpadService => {
  const getApiPath = function () {
    return `${API_ROUTE_WORKPAD}`;
  };
  return {
    get: async (id: string) => {
      const workpad = await coreStart.http.get(`${getApiPath()}/${id}`);

      return { css: DEFAULT_WORKPAD_CSS, variables: [], ...workpad };
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
    createFromTemplate: (templateId: string) => {
      return coreStart.http.post(getApiPath(), {
        body: JSON.stringify({ templateId }),
      });
    },
    find: (searchTerm: string) => {
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
  };
};
