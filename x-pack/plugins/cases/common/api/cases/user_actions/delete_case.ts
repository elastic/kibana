/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { Actions, Fields } from './common';

export const DeleteCaseUserActionRt = rt.type({
  fields: rt.array(
    rt.union([
      rt.literal(Fields.description),
      rt.literal(Fields.status),
      rt.literal(Fields.tags),
      rt.literal(Fields.title),
      rt.literal(Fields.connector),
      rt.literal(Fields.settings),
      rt.literal(Fields.owner),
      rt.literal(Fields.comment),
    ])
  ),
  action: rt.literal(Actions.delete),
  payload: rt.null,
});

export type DeleteCaseUserAction = rt.TypeOf<typeof DeleteCaseUserActionRt>;
