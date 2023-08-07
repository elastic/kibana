/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { inventoryViewAttributesRT, inventoryViewRT } from '../../../inventory_views';

export const updateInventoryViewAttributesRequestPayloadRT = rt.exact(
  rt.intersection([
    inventoryViewAttributesRT,
    rt.partial({
      isDefault: rt.undefined,
      isStatic: rt.undefined,
    }),
  ])
);

export type UpdateInventoryViewAttributesRequestPayload = rt.TypeOf<
  typeof updateInventoryViewAttributesRequestPayloadRT
>;

export const updateInventoryViewRequestPayloadRT = rt.type({
  attributes: updateInventoryViewAttributesRequestPayloadRT,
});

export type UpdateInventoryViewResponsePayload = rt.TypeOf<typeof inventoryViewRT>;
