/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nonEmptyStringRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';

export const createMetricsExplorerViewAttributesRequestPayloadRT = rt.intersection([
  rt.type({
    name: nonEmptyStringRt,
  }),
  rt.UnknownRecord,
  rt.exact(rt.partial({ isDefault: rt.undefined, isStatic: rt.undefined })),
]);

export type CreateMetricsExplorerViewAttributesRequestPayload = rt.TypeOf<
  typeof createMetricsExplorerViewAttributesRequestPayloadRT
>;

export const createMetricsExplorerViewRequestPayloadRT = rt.type({
  attributes: createMetricsExplorerViewAttributesRequestPayloadRT,
});

export type CreateMetricsExplorerViewRequestPayload = rt.TypeOf<
  typeof createMetricsExplorerViewRequestPayloadRT
>;
