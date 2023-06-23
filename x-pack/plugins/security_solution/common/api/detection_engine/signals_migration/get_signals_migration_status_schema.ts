/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { RuleIntervalFrom } from '@kbn/securitysolution-io-ts-alerting-types';

export const getSignalsMigrationStatusSchema = t.exact(
  t.type({
    from: RuleIntervalFrom,
  })
);

export type GetSignalsMigrationStatusSchema = t.TypeOf<typeof getSignalsMigrationStatusSchema>;
