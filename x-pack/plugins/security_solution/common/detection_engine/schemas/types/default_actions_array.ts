/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { actions, Actions } from '../common/schemas';

/**
 * Types the DefaultStringArray as:
 *   - If undefined, then a default action array will be set
 */
export const DefaultActionsArray = new t.Type<Actions, Actions | undefined, unknown>(
  'DefaultActionsArray',
  actions.is,
  (input, context): Either<t.Errors, Actions> =>
    input == null ? t.success([]) : actions.validate(input, context),
  t.identity
);
