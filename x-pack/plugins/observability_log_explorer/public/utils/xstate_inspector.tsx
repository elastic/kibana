/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDevToolsOptions, isDevMode } from '@kbn/xstate-utils';
import { useEffect } from 'react';

export const useXStateInspector = () => {
  useEffect(() => {
    if (isDevMode()) {
      // eslint-disable-next-line import/no-extraneous-dependencies
      import('@xstate/inspect').then(({ inspect }) => {
        inspect({
          iframe: false,
          serialize: getDevToolsOptions().actionSanitizer!,
        });
      });
    }
  }, []);
};
