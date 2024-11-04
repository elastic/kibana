/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { limitedArraySchema, NonEmptyString } from '../../../schema';
import { CaseObservableRt, ObservablePatch } from '../../domain';

/**
 * Observables
 */

const MIN_DELETE_IDS = 1;
const MAX_DELETE_IDS = 10;

export const BulkDeleteObservablesRequestRt = rt.strict({
  ids: limitedArraySchema({
    codec: NonEmptyString,
    min: MIN_DELETE_IDS,
    max: MAX_DELETE_IDS,
    fieldName: 'ids',
  }),
});

export type BulkDeleteObservablesRequest = rt.TypeOf<typeof BulkDeleteObservablesRequestRt>;

export const ObservableRequestRt = rt.strict({
  observables: rt.array(ObservablePatch),
  version: rt.string,
});

export const ObservablePatchRequestRt = rt.intersection([
  /**
   * Partial updates are not allowed.
   */
  ObservableRequestRt,
  rt.strict({ id: rt.string }),
]);

export const BulkCreateObservablesRequestRt = limitedArraySchema({
  codec: ObservableRequestRt,
  min: 0,
  max: 1,
  fieldName: 'observables',
});

export const BulkGetObservablesRequestRt = rt.strict({
  ids: limitedArraySchema({
    codec: rt.string,
    min: 1,
    max: 10,
    fieldName: 'ids',
  }),
});

export const BulkGetObservablesResponseRt = rt.strict({
  observables: CaseObservableRt,
  errors: rt.array(
    rt.strict({
      error: rt.string,
      message: rt.string,
      status: rt.union([rt.undefined, rt.number]),
      attachmentId: rt.string,
    })
  ),
});

export type ObservableRequest = rt.TypeOf<typeof ObservableRequestRt>;
