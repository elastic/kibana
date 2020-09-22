/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This function ends the current event loop which will give all promises a chance
 * to complete. It is similar to calling `setTimeout` without specifying a length of
 * time.
 *
 * For example:
 *   // Mock http.get to return a rejected promise immediately
 *   (HttpLogic.values.http.get as jest.Mock).mockReturnValue(Promise.reject('An error occured'));
 *   // Call an action, which calls http.get and awaits it
 *   CredentialsLogic.actions.fetchCredentials(2);
 *   // Give the http.get promise a chance to be rejected
 *   await flushPromises();
 *   // Make assertions
 *   expect(flashAPIErrors).toHaveBeenCalledWith('An error occured');
 */
export const flushPromises = () => {
  return new Promise((resolve) => setImmediate(resolve));
};
