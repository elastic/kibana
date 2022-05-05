/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseSeverityRt } from '../case';
import { ActionTypes, UserActionWithAttributes } from './common';

export const SeverityUserActionPayloadRt = rt.type({ severity: CaseSeverityRt });

export const SeverityUserActionRt = rt.type({
  type: rt.literal(ActionTypes.severity),
  payload: SeverityUserActionPayloadRt,
});

export type SeverityUserAction = UserActionWithAttributes<rt.TypeOf<typeof SeverityUserActionRt>>;
