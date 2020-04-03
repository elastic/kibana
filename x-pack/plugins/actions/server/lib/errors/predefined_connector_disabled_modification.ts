/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaResponseFactory } from '../../../../../../src/core/server';
import { ErrorThatHandlesItsOwnResponse } from './types';

export type PredefinedConnectorDisabledFrom = 'update' | 'delete';

export class PredefinedConnectorDisabledModificationError extends Error
  implements ErrorThatHandlesItsOwnResponse {
  public readonly disabledFrom: PredefinedConnectorDisabledFrom;

  constructor(message: string, disabledFrom: PredefinedConnectorDisabledFrom) {
    super(message);
    this.disabledFrom = disabledFrom;
  }

  public sendResponse(res: KibanaResponseFactory) {
    return res.badRequest({ body: { message: this.message } });
  }
}
