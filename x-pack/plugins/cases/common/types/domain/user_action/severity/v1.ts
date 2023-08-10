/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseSeverityRt } from '../../case/v1';
import { UserActionTypes } from '../action/v1';

export const SeverityUserActionPayloadRt = rt.strict({ severity: CaseSeverityRt });

export const SeverityUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.severity),
  payload: SeverityUserActionPayloadRt,
});
