/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const ServiceNowFieldsRT = rt.type({
  short_description: rt.string,
  description: rt.union([rt.string, rt.null]),
  comments: rt.union([rt.array(rt.string), rt.null]),
});
export const ServiceNowSettingFieldsRT = rt.type({
  impact: rt.string,
  severity: rt.string,
  urgency: rt.string,
});
export type ServiceNowFieldsType = rt.TypeOf<typeof ServiceNowFieldsRT>;
export type ServiceNowSettingFields = rt.TypeOf<typeof ServiceNowSettingFieldsRT>;
