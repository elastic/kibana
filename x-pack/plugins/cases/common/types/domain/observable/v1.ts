/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const CaseObservableBaseRt = rt.strict({
  id: rt.union([rt.string, rt.undefined]),
  typeKey: rt.string,
  value: rt.string,
  description: rt.union([rt.string, rt.undefined]),
  isIoc: rt.boolean,
  hasBeenSighted: rt.boolean,
});

export const CaseObservableRt = rt.intersection([
  rt.strict({
    createdAt: rt.string,
    updatedAt: rt.union([rt.string, rt.undefined]),
  }),
  CaseObservableBaseRt,
]);

export const CaseObservableTypeRt = rt.strict({
  key: rt.string,
  label: rt.string,
});

export type Observable = rt.TypeOf<typeof CaseObservableRt>;
export type ObservableType = rt.TypeOf<typeof CaseObservableTypeRt>;

export const ObservablePatch = CaseObservableRt;

export type ObservablePatchType = rt.TypeOf<typeof ObservablePatch>;
