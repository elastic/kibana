/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseObservableRt, ObservablePatch } from '../../domain';

/**
 * Observables
 */

export const AddObservableRequestRt = rt.strict({
  observable: ObservablePatch,
});

export const UpdateObservableRequestRt = rt.strict({
  observable: ObservablePatch,
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

export type AddObservableRequest = rt.TypeOf<typeof AddObservableRequestRt>;
export type UpdateObservableRequest = rt.TypeOf<typeof UpdateObservableRequestRt>;

export type ObservableRequest = AddObservableRequest;
