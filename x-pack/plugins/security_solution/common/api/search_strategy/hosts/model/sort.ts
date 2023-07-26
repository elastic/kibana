/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

export enum HostsFields {
  lastSeen = 'lastSeen',
  hostName = 'hostName',
  success = 'success',
}

import { sort as baseSort } from '../../model/sort';

const field = z.enum([HostsFields.lastSeen, HostsFields.hostName, HostsFields.success]);

export const sort = baseSort.extend({
  field,
});
