/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { unionWithNullType } from '../../../utility_types';

export const exportTimelinesQuerySchema = rt.type({
  file_name: rt.string,
});

export const exportTimelinesRequestBodySchema = rt.partial({
  ids: unionWithNullType(rt.array(rt.string)),
});
