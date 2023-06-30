/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { inventoryViewBasicAttributesRT, singleInventoryViewRT } from '../../../inventory_views';

export const findInventoryViewAttributesResponseRT = rt.exact(
  rt.intersection([
    inventoryViewBasicAttributesRT,
    rt.partial({
      isDefault: rt.boolean,
      isStatic: rt.boolean,
    }),
  ])
);

export const findInventoryViewResponsePayloadRT = rt.type({
  data: rt.array(singleInventoryViewRT),
});

export type FindInventoryViewResponsePayload = rt.TypeOf<typeof findInventoryViewResponsePayloadRT>;
