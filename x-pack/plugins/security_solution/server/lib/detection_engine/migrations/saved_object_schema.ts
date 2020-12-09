/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { PositiveInteger } from '../../../../common/detection_engine/schemas/types';
import { unionWithNullType } from '../../../../common/utility_types';

const status = t.keyof({ success: null, failure: null, pending: null });
/*
 * Attributes for our Signals Migration SO
 */
export const signalsMigrationSOAttributes = t.intersection([
  t.type({
    sourceIndex: t.string,
    destinationIndex: t.string,
    status,
    taskId: t.string,
    version: PositiveInteger,
  }),
  t.partial({
    created: unionWithNullType(t.number),
    createdBy: unionWithNullType(t.string),
    updated: unionWithNullType(t.number),
    updatedBy: unionWithNullType(t.string),
  }),
]);

export type SignalsMigrationSOAttributes = t.TypeOf<typeof signalsMigrationSOAttributes>;

export const signalsMigrationSavedObject = t.type({
  id: t.string,
  attributes: signalsMigrationSOAttributes,
});

export type SignalsMigrationSavedObject = t.TypeOf<typeof signalsMigrationSavedObject>;
