/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { actions, Actions } from '../common/schemas';

export type DefaultActionsArrayC = t.Type<Actions, Actions, unknown>;

/**
 * Types the DefaultStringArray as:
 *   - If null or undefined, then a default action array will be set
 */
export const DefaultActionsArray: DefaultActionsArrayC = new t.Type<Actions, Actions, unknown>(
  'DefaultActionsArray',
  actions.is,
  (input): Either<t.Errors, Actions> => (input == null ? t.success([]) : actions.decode(input)),
  t.identity
);
