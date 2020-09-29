/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const ResilientFieldsRT = rt.type({
  name: rt.string,
  description: rt.union([rt.string, rt.null]),
  comments: rt.union([rt.array(rt.string), rt.null]),
});

export const ResilientSettingFieldsRT = rt.type({
  incidentTypes: rt.array(rt.number),
  severityCode: rt.number,
});

export type ResilientFieldsType = rt.TypeOf<typeof ResilientFieldsRT>;
