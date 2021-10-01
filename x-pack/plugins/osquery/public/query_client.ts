/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-empty-function */

import { QueryClient, setLogger } from 'react-query';

setLogger({
  log: () => {},
  warn: () => {},
  error: () => {},
});

export const queryClient = new QueryClient();
