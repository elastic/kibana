/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ActionTypes, UserActionWithAttributes } from './common';

export const TitleUserActionPayloadRt = rt.type({ title: rt.string });

export const TitleUserActionRt = rt.type({
  type: rt.literal(ActionTypes.title),
  payload: TitleUserActionPayloadRt,
});

export type TitleUserAction = UserActionWithAttributes<rt.TypeOf<typeof TitleUserActionRt>>;
