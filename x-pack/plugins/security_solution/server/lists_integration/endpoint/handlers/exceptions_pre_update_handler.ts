/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExceptionsListPreUpdateItemServerExtension,
  UpdateExceptionListItemOptions,
} from '../../../../../lists/server';

export const getExceptionsPreUpdateItemHandler =
  (): ExceptionsListPreUpdateItemServerExtension['callback'] => {
    return async function (
      data: UpdateExceptionListItemOptions
    ): Promise<UpdateExceptionListItemOptions> {
      console.log(`Request from: ${this.request?.url}`);
      return data;

      // FIXME: implement method
    };
  };
