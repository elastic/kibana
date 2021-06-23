/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { IsoDateString, PositiveInteger } from '@kbn/securitysolution-io-ts-types';
import { unionWithNullType } from '../../../../common/utility_types';

const status = t.keyof({ success: null, failure: null, pending: null });

const signalsMigrationSOWriteAttributes = {
  destinationIndex: t.string,
  error: unionWithNullType(t.string),
  sourceIndex: t.string,
  status,
  taskId: t.string,
  version: PositiveInteger,
};

const signalsMigrationSOGeneratedAttributes = {
  created: IsoDateString,
  createdBy: t.string,
  updated: IsoDateString,
  updatedBy: t.string,
};

const signalsMigrationSOError = {
  statusCode: t.number,
  error: t.string,
  message: t.string,
};

/**
 The attributes necessary to create a Signals Migration Saved Object
 */
export const signalsMigrationSOCreateAttributes = t.exact(
  t.type(signalsMigrationSOWriteAttributes)
);
export type SignalsMigrationSOCreateAttributes = t.TypeOf<
  typeof signalsMigrationSOCreateAttributes
>;

/**
 The attributes necessary to update a Signals Migration Saved Object
 */
export const signalsMigrationSOUpdateAttributes = t.exact(
  t.partial(signalsMigrationSOWriteAttributes)
);
export type SignalsMigrationSOUpdateAttributes = t.TypeOf<
  typeof signalsMigrationSOUpdateAttributes
>;

/**
 The attributes of our Signals Migration Saved Object
 */
export const signalsMigrationSOAttributes = t.exact(
  t.type({
    ...signalsMigrationSOWriteAttributes,
    ...signalsMigrationSOGeneratedAttributes,
  })
);
export type SignalsMigrationSOAttributes = t.TypeOf<typeof signalsMigrationSOAttributes>;

export const signalsMigrationSO = t.intersection([
  t.type({
    id: t.string,
    attributes: signalsMigrationSOAttributes,
    type: t.string,
  }),
  t.partial({ error: t.type(signalsMigrationSOError) }),
]);
export type SignalsMigrationSO = t.TypeOf<typeof signalsMigrationSO>;

export const signalsMigrationSOs = t.array(signalsMigrationSO);
