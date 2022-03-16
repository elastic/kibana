/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

const AlertRt = rt.type({
  id: rt.string,
  index: rt.string,
  attached_at: rt.string,
});

export const AlertResponseRt = rt.array(AlertRt);
export type AlertResponse = rt.TypeOf<typeof AlertResponseRt>;
