/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { actions, Actions } from '../common/schemas';

/**
 * Types the DefaultStringArray as:
 *   - If null or undefined, then a default action array will be set
 */
export const DefaultActionsArray = new t.Type<Actions, Actions, unknown>(
  'DefaultActionsArray',
  actions.is,
  (input, context): Either<t.Errors, Actions> =>
    input == null ? t.success([]) : actions.validate(input, context),
  t.identity
);

export type DefaultActionsArrayC = typeof DefaultActionsArray;
