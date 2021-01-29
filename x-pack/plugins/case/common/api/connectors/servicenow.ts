/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const ServiceNowFieldsRT = rt.type({
  impact: rt.union([rt.string, rt.null]),
  severity: rt.union([rt.string, rt.null]),
  urgency: rt.union([rt.string, rt.null]),
});

export type ServiceNowFieldsType = rt.TypeOf<typeof ServiceNowFieldsRT>;
