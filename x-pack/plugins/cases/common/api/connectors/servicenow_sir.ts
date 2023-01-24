/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const ServiceNowSIRFieldsRT = rt.type({
  category: rt.union([rt.string, rt.null]),
  destIp: rt.union([rt.boolean, rt.null]),
  malwareHash: rt.union([rt.boolean, rt.null]),
  malwareUrl: rt.union([rt.boolean, rt.null]),
  priority: rt.union([rt.string, rt.null]),
  sourceIp: rt.union([rt.boolean, rt.null]),
  subcategory: rt.union([rt.string, rt.null]),
});

export type ServiceNowSIRFieldsType = rt.TypeOf<typeof ServiceNowSIRFieldsRT>;
