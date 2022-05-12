/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ActionTypes, UserActionWithAttributes } from './common';

export const DescriptionUserActionPayloadRt = rt.type({ description: rt.string });

export const DescriptionUserActionRt = rt.type({
  type: rt.literal(ActionTypes.description),
  payload: DescriptionUserActionPayloadRt,
});

export type DescriptionUserAction = UserActionWithAttributes<
  rt.TypeOf<typeof DescriptionUserActionRt>
>;
