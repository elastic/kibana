/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */
export class RuleDataWriteDisabledError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'RuleDataWriteDisabledError';
  }
}

export class RuleDataWriterInitializationError extends Error {
  constructor(
    resourceType: 'index' | 'namespace',
    registrationContext: string,
    error: string | Error
  ) {
    super(`There has been a catastrophic error trying to install ${resourceType} level resources for the following registration context: ${registrationContext}. 
    This may have been due to a non-additive change to the mappings, removal and type changes are not permitted. Full error: ${error.toString()}`);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'RuleDataWriterInitializationError';
  }
}
