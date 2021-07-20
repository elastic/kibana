/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

export class EndpointError extends Error {
  constructor(message: string) {
    super(message);
    // For debugging - capture name of subclasses
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends EndpointError {}
