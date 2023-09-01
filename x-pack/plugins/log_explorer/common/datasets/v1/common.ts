/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EPM_API_ROUTES } from '@kbn/fleet-plugin/common';
import * as rt from 'io-ts';

/**
 * Constants
 */
export const DATASETS_URL = EPM_API_ROUTES.DATA_STREAMS_PATTERN;
export const INTEGRATIONS_URL = EPM_API_ROUTES.INSTALLED_LIST_PATTERN;

/**
 * Common types
 */
export const sortOrderRT = rt.keyof({
  asc: null,
  desc: null,
});
export type SortOrder = rt.TypeOf<typeof sortOrderRT>;
