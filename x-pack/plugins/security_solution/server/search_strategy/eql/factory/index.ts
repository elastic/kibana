/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EqlQueryTypes } from '../../../../common/search_strategy/eql';
import { EqlQueryFactory } from './types';
import { eqlValidationQuery } from './validation';

export * from './types';

export const eqlQueryFactory: Record<EqlQueryTypes, EqlQueryFactory<EqlQueryTypes>> = {
  [EqlQueryTypes.validation]: eqlValidationQuery,
};
