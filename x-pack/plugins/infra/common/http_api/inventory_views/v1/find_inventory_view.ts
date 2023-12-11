/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { singleInventoryViewRT } from '../../../inventory_views';

export const findInventoryViewResponsePayloadRT = rt.type({
  data: rt.array(singleInventoryViewRT),
});

export type FindInventoryViewResponsePayload = rt.TypeOf<typeof findInventoryViewResponsePayloadRT>;
