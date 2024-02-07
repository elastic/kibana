/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */
import { ALERTS_TABLE_FILTERS_ERROR_TITLE } from './translations';

export class RecoverableError extends Error {
  recover?: () => void;
}

export class UnsupportedAlertsFiltersSetError extends RecoverableError {
  constructor(public recover?: RecoverableError['recover']) {
    super(ALERTS_TABLE_FILTERS_ERROR_TITLE);
    this.name = 'UnsupportedAlertsFiltersSetError';
  }
}
