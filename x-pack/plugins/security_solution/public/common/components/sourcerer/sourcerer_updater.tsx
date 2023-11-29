/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

export interface SourcererData {
  indicesExist: boolean | null;
}

// Used to update the SourcererUpdater observable internally.
const SourcererUpdater = new BehaviorSubject<SourcererData>({
  indicesExist: null,
});

// The observable can be exposed by the plugin contract.
export const sourcerer$ = SourcererUpdater.asObservable();

export const updateSourcererData = (context: SourcererData) => {
  SourcererUpdater.next(context);
};
