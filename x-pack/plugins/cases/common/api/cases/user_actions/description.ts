/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { Fields, Actions } from './common';

export const DescriptionUserActionPayloadRt = rt.type({ description: rt.string });

export const DescriptionUserActionRt = rt.type({
  fields: rt.array(rt.literal(Fields.description)),
  action: rt.literal(Actions.update),
  payload: DescriptionUserActionPayloadRt,
});

export type DescriptionUserAction = rt.TypeOf<typeof DescriptionUserActionRt>;
