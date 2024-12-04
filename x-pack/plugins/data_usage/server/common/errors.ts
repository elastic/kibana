/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class BaseError<MetaType = unknown> extends Error {
  constructor(message: string, public readonly meta?: MetaType) {
    super(message);
    // For debugging - capture name of subclasses
    this.name = this.constructor.name;

    if (meta instanceof Error) {
      this.stack += `\n----- original error -----\n${meta.stack}`;
    }
  }
}

export const NoPrivilegeMeteringError =
  'You do not have the necessary privileges to access data stream statistics. Please contact your administrator.';

export const NoIndicesMeteringError =
  'No data streams or indices are available for the current user. Ensure that the data streams or indices you are authorized to access have been created and contain data. If you believe this is an error, please contact your administrator.';
