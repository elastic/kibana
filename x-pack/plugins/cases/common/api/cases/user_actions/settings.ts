/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ActionTypes, UserActionWithAttributes } from './common';
import { SettingsRt } from '../case';

export const SettingsUserActionPayloadRt = rt.type({ settings: SettingsRt });

export const SettingsUserActionRt = rt.type({
  type: rt.literal(ActionTypes.settings),
  payload: SettingsUserActionPayloadRt,
});

export type SettingsUserAction = UserActionWithAttributes<rt.TypeOf<typeof SettingsUserActionRt>>;
