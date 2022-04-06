/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, setLogger } from 'react-query';

// By default, the query client will output errors in console for
// us, but we dont need that right now.
setLogger({
  log: () => {},
  warn: () => {},
  error: () => {},
});

export const queryClient = new QueryClient();
