/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { Fields, Actions } from './common';

export const TagsUserActionPayloadRt = rt.type({ tags: rt.array(rt.string) });

export const TagsUserActionRt = rt.type({
  fields: rt.array(rt.literal(Fields.tags)),
  action: rt.literal(Actions.update),
  payload: TagsUserActionPayloadRt,
});

export type TagsUserAction = rt.TypeOf<typeof TagsUserActionRt>;
