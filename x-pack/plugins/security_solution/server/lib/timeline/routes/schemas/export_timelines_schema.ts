/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { unionWithNullType } from '../../../../../common/utility_types';

export const exportTimelinesQuerySchema = rt.type({
  file_name: rt.string,
});

export const exportTimelinesRequestBodySchema = unionWithNullType(
  rt.partial({
    ids: unionWithNullType(rt.array(rt.string)),
  })
);
