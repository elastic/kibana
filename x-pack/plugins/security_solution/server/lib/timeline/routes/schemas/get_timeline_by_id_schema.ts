/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as rt from 'io-ts';

export const getTimelineByIdSchemaQuery = rt.partial({
  template_timeline_id: rt.string,
  id: rt.string,
});

export type GetTimelineByIdSchemaQuery = rt.TypeOf<typeof getTimelineByIdSchemaQuery>;
