/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListItemOptions,
  ExceptionsListPreCreateItemServerExtension,
} from '../../../../../lists/server';

export const getExceptionsPreCreateItemHandler =
  (): ExceptionsListPreCreateItemServerExtension['callback'] => {
    return async function (
      data: CreateExceptionListItemOptions
    ): Promise<CreateExceptionListItemOptions> {
      console.log(`Request from: ${this.request?.url}`);

      return data;
      // FIXME:PT implement callback logic
      // If Trusted app - validate
      //
      // if Event Filters - validate
      //
      // if Host Isolation Exceptions - validate
      //
      //
      // --- else, just return
    };
  };
