/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

// TODO: We should fully build out this interface for our router
// or switch to a different router that is already typed
interface Router {
  navigateTo: (
    name: string,
    params: Record<string, number | string>,
    state?: Record<string, string>
  ) => void;
}

export const RouterContext = React.createContext<Router | undefined>(undefined);
