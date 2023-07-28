/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { inventoryViewRT } from '../../../inventory_views';

export const getInventoryViewRequestParamsRT = rt.type({
  inventoryViewId: rt.string,
});

export type GetInventoryViewResposePayload = rt.TypeOf<typeof inventoryViewRT>;
