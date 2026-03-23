/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericFtrProviderContext } from '@kbn/test';
import { automaticImportV2CommonServices } from './common';

/**
 * Automatic Import V2 API-only services.
 * Composes common deployment-agnostic services and adds any automatic_import_v2-specific API helpers.
 */
export const automaticImportV2ApiServices = {
  ...automaticImportV2CommonServices,
};

export type AutomaticImportV2ApiFtrProviderContext = GenericFtrProviderContext<
  typeof automaticImportV2ApiServices,
  {}
>;
