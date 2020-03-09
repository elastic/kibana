/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const UserRT = rt.type({
  full_name: rt.union([rt.undefined, rt.string, rt.null]),
  username: rt.union([rt.string, rt.null]),
});
