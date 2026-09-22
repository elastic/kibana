/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericFtrProviderContext } from '@kbn/test';
import { automaticImportCommonServices } from './common';

/**
 * Automatic Import API-only services.
 * Composes common deployment-agnostic services and adds any automatic_import-specific API helpers.
 */
export const automaticImportApiServices = {
  ...automaticImportCommonServices,
};

export type AutomaticImportApiFtrProviderContext = GenericFtrProviderContext<
  typeof automaticImportApiServices,
  {}
>;
