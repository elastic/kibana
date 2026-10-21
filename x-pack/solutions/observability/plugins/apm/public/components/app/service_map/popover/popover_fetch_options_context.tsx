/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

interface PopoverFetchOptions {
  /** Whether a failed popover stats request raises the global error toast. */
  showToastOnError: boolean;
}

/**
 * Hosts that embed the map outside the APM app (e.g. the Agent Builder
 * attachment) can disable the toast: the popovers already render their own
 * empty state, and e.g. a 403 on a non-platinum license shouldn't surface a
 * toast. The APM app keeps the default.
 */
export const PopoverFetchOptionsContext = createContext<PopoverFetchOptions>({
  showToastOnError: true,
});

export const usePopoverFetchOptions = () => useContext(PopoverFetchOptionsContext);
