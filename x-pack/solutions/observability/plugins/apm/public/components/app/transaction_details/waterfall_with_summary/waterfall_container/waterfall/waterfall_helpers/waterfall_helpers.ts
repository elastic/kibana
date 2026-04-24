/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Error } from '@kbn/apm-types';

// TODO: check it later on
export type IWaterfallError = Omit<
  IWaterfallItemBase<Error, 'error'>,
  'duration' | 'legendValues' | 'spanLinksCount'
>;
