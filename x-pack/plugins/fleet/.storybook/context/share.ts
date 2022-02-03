/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from 'src/plugins/share/public';

export const getShare = () => {
  const share: SharePluginStart = {
    url: {
      locators: {
        get: () => ({
          useUrl: () => 'https://locator.url',
        }),
      },
    },
  } as unknown as SharePluginStart;

  return share;
};
