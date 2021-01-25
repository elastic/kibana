/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * If you created an immediately resolved promise, you can use this to wait for it to resolve without a reference.
 *
 * http.get.mockReturnValueOnce(Promise.resolve({ analyticsUnavailable: true }));
 * AnalyticsLogic.actions.loadQueryData('some-query');
 * 
 * await waitForPromises();
        
 * expect(AnalyticsLogic.actions.onAnalyticsUnavailable).toHaveBeenCalled();
 *
 */
export function waitForPromises() {
  let promiseResolve: (value: unknown) => void;
  const promise = new Promise((resolve) => (promiseResolve = resolve));
  setTimeout(() => promiseResolve(undefined));
  return promise;
}
