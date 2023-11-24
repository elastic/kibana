/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

export interface LandingPageContext {
  indicesExist: boolean | null;
  rulesInstalled: boolean | null;
}

// Used to update the landingPageContextUpdater$ observable internally.
const landingPageContextUpdater$ = new BehaviorSubject<LandingPageContext>({
  indicesExist: null,
  rulesInstalled: null,
});

// The observable can be exposed by the plugin contract.
export const landingPageContext$ = landingPageContextUpdater$.asObservable();

export const updateLandingPageContext = (context: LandingPageContext) => {
  landingPageContextUpdater$.next(context);
};
