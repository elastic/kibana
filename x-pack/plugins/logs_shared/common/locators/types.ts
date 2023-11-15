/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const ItemTypeRT = rt.keyof({
  host: null,
  pod: null,
  container: null,
  awsEC2: null,
  awsS3: null,
  awsSQS: null,
  awsRDS: null,
});

export type InventoryItemType = rt.TypeOf<typeof ItemTypeRT>;
