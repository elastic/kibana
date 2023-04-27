/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochRt, nonEmptyStringRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';

export const metricsExplorerViewSavedObjectAttributesRT = rt.intersection([
  rt.strict({
    name: nonEmptyStringRt,
  }),
  rt.UnknownRecord,
]);

export const metricsExplorerViewSavedObjectRT = rt.intersection([
  rt.type({
    id: rt.string,
    attributes: metricsExplorerViewSavedObjectAttributesRT,
  }),
  rt.partial({
    version: rt.string,
    updated_at: isoToEpochRt,
  }),
]);
