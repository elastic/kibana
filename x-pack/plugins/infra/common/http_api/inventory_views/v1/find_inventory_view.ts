/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nonEmptyStringRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';

export const findInventoryViewAttributesResponseRT = rt.strict({
  name: nonEmptyStringRt,
  isDefault: rt.boolean,
  isStatic: rt.boolean,
});

const findInventoryViewResponseRT = rt.exact(
  rt.intersection([
    rt.type({
      id: rt.string,
      attributes: findInventoryViewAttributesResponseRT,
    }),
    rt.partial({
      updatedAt: rt.number,
      version: rt.string,
    }),
  ])
);

export const findInventoryViewResponsePayloadRT = rt.type({
  data: rt.array(findInventoryViewResponseRT),
});
