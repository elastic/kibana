/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_STATE_URL_KEY } from '@kbn/discover-plugin/public';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createMemoryHistory } from 'history';

/**
 * Create a url state storage that's not connected to the real browser location
 * to isolate the Discover component from these side-effects.
 *
 * It is initialized with an application state object, because Discover
 * radically resets too much when the URL is "empty".
 */
export const createMemoryUrlStateStorage = () =>
  createKbnUrlStateStorage({
    history: createMemoryHistory({
      initialEntries: [{ search: `?${APP_STATE_URL_KEY}=()` }],
    }),
    useHash: false,
    useHashQuery: false,
  });
