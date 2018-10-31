/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function latestChange(...firstArgs) {
  let oldState = firstArgs;
  let prevValue = null;

  return (...args) => {
    let found = false;

    const newState = oldState.map((oldVal, i) => {
      const val = args[i];
      if (!found && oldVal !== val) {
        found = true;
        prevValue = val;
      }
      return val;
    });

    oldState = newState;

    return prevValue;
  };
}
