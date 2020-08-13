/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SetupStatus } from './setup';

// the promise which tracks the setup
let setupIngestStatus: Promise<SetupStatus> | undefined;
// default resolve to guard against "undefined is not a function" errors
let onSetupResolve = (status: SetupStatus) => {};
let onSetupReject = (reason: any) => {};

export async function limitOne(asyncFunction: Function) {
  // pending pending or successful attempt
  if (setupIngestStatus) {
    // don't run concurrent installs
    return setupIngestStatus;
  } else {
    // create the initial promise
    setupIngestStatus = new Promise((res, rej) => {
      onSetupResolve = res;
      onSetupReject = rej;
    });
  }
  try {
    // if everything works, mark the tracking promise as resolved
    const result = await asyncFunction();
    onSetupResolve(result);
    // * reset the tracking promise to try again next time
    setupIngestStatus = undefined;
    return result;
  } catch (error) {
    // if something fails
    onSetupReject(error);
    // * reset the tracking promise to try again next time
    setupIngestStatus = undefined;
    // * return the rejection so it can be dealt with now
    return Promise.reject(error);
  }
}
