/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// the promise which tracks the setup
let status: Promise<unknown> | undefined;
// default resolve to guard against "undefined is not a function" errors
let onResolve = (value?: unknown) => {};
let onReject = (reason: any) => {};

export async function awaitIfPending(asyncFunction: Function) {
  // pending successful or failed attempt
  if (status) {
    // don't run concurrent installs
    return status;
  } else {
    // create the initial promise
    status = new Promise((res, rej) => {
      onResolve = res;
      onReject = rej;
    });
  }
  try {
    // if everything works, mark the tracking promise as resolved
    const result = await asyncFunction();
    onResolve(result);
    // * reset the tracking promise to try again next time
    status = undefined;
    return result;
  } catch (error) {
    // if something fails
    onReject(error);
    // * reset the tracking promise to try again next time
    status = undefined;
    // * return the rejection so it can be dealt with now
    return Promise.reject(error);
  }
}
