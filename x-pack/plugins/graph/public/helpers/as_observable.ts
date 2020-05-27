/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';

interface Props {
  [key: string]: unknown | ((...args: unknown[]) => void);
}

/**
 * This is a helper to tie state updates that happen somewhere else back to an angular scope.
 * It is roughly comparable to `reactDirective`, but does not have to be used from within a
 * template.
 *
 * This is a temporary solution until the state management is moved outside of Angular.
 *
 * @param collectProps Function that collects properties from the scope that should be passed
 * into the observable. All functions passed along will be wrapped to cause an angular digest cycle
 * and refresh the observable afterwards with a new call to `collectProps`. By doing so, angular
 * can react to changes made outside of it and the results are passed back via the observable
 * @param angularDigest The `$digest` function of the scope.
 */
export function asAngularSyncedObservable(collectProps: () => Props, angularDigest: () => void) {
  const boundCollectProps = () => {
    const collectedProps = collectProps();
    Object.keys(collectedProps).forEach((key) => {
      const currentValue = collectedProps[key];
      if (typeof currentValue === 'function') {
        collectedProps[key] = (...args: unknown[]) => {
          currentValue(...args);
          angularDigest();
          subject$.next(boundCollectProps());
        };
      }
    });
    return collectedProps;
  };
  const subject$ = new Rx.BehaviorSubject(boundCollectProps());
  return subject$.asObservable();
}
