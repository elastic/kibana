/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseObservableBaseRt } from '../../domain/observable/v1';

/**
 * Observables
 */
export const ObservablePatch = CaseObservableBaseRt;
export type ObservablePatchType = rt.TypeOf<typeof ObservablePatch>;

export const AddObservableRequestRt = rt.strict({
  observable: ObservablePatch,
});

export const UpdateObservableRequestRt = rt.strict({
  observable: ObservablePatch,
});

export type AddObservableRequest = rt.TypeOf<typeof AddObservableRequestRt>;
export type UpdateObservableRequest = rt.TypeOf<typeof UpdateObservableRequestRt>;
