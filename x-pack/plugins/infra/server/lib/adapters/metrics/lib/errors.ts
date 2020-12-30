/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApolloError } from 'apollo-server-errors';
import { InfraMetricsErrorCodes } from '../../../../../common/errors';

export class InvalidNodeError extends ApolloError {
  constructor(message: string) {
    super(message, InfraMetricsErrorCodes.invalid_node);
    Object.defineProperty(this, 'name', { value: 'InvalidNodeError' });
  }
}
