/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { logViewAttributesRT } from '../../../common/log_views';
import { savedObjectReferenceRT } from '../references';

export const logViewSavedObjectRT = rt.intersection([
  rt.type({
    id: rt.string,
    attributes: logViewAttributesRT,
    references: rt.array(savedObjectReferenceRT),
  }),
  rt.partial({
    version: rt.string,
    updated_at: isoToEpochRt,
  }),
]);
