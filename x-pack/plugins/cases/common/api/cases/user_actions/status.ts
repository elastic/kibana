/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { Fields, Actions } from './common';

export const StatusUserActionPayloadRt = rt.type({ status: rt.string });

export const StatusUserActionRt = rt.type({
  fields: rt.array(rt.literal(Fields.status)),
  action: rt.literal(Actions.update),
  payload: StatusUserActionPayloadRt,
});

export type StatusUserAction = rt.TypeOf<typeof StatusUserActionRt>;
