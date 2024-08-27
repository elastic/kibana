/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import type { CoreStart } from '@kbn/core/public';
import { Subject } from 'rxjs';

export const createKibanaServicesMock = (overrides?: Partial<CoreStart>) => {
  const baseMock = {
    data: {
      dataViews: {
        create: async () => {},
        get: async () => {},
      },
    },
    http: {
      get: async () => {},
      basePath: {
        get: () => '',
      },
    },
    notifications: {
      toasts: {
        addError: () => {},
        addSuccess: () => {},
        addWarning: () => {},
        remove: () => {},
      },
    },
    settings: {
      client: {
        get: () => {},
        get$: () => new Subject(),
        set: () => {},
      },
    },
    uiSettings: {},
  } as unknown as CoreStart;

  return merge(baseMock, overrides);
};
