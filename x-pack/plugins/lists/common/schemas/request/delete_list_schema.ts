/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { DefaultStringBooleanFalse, id } from '@kbn/securitysolution-io-ts-utils';

import { RequiredKeepUndefined } from '../../types';

export const deleteListSchema = t.intersection([
  t.exact(
    t.type({
      id,
    })
  ),
  t.exact(
    t.partial({
      deleteReferences: DefaultStringBooleanFalse,
      ignoreReferences: DefaultStringBooleanFalse,
    })
  ),
]);

export type DeleteListSchema = RequiredKeepUndefined<t.TypeOf<typeof deleteListSchema>>;
export type DeleteListSchemaEncoded = t.OutputOf<typeof deleteListSchema>;
