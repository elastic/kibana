/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// call setNext on all the N-1 checkers to link them to the next checker
const mapCheckers = (_checkers) => {
  return _checkers.map((current, checkerIndex) => {
    const next = _checkers[checkerIndex + 1];
    if (next !== undefined) {
      current.setNext(next);
    }

    return current;
  });
};

/*
 * NOTE: This returns a promise, thus the async. Typically there is no need to
 * await the return value since the function internals updates the controller's
 * model its their own.
 */
export async function startChecks(checkers, updateModel) {
  const runCheck = async (currentChecker) => {
    updateModel({ checkMessage: currentChecker.getMessage() });

    const { found, reason, error, errorReason } = await currentChecker.executeCheck();

    if (error) {
      updateModel({ errors: errorReason });
      if (currentChecker.hasNext()) {
        return runCheck(currentChecker.getNext());
      }
    } else if (found) {
      return updateModel({
        reason,
        isLoading: false,
        checkMessage: null,
      });
    } else if (currentChecker.hasNext()) {
      return runCheck(currentChecker.getNext());
    }

    // dead end
    updateModel({
      reason: null,
      isLoading: false,
      checkMessage: null,
    });
  };

  const _checkers = mapCheckers(checkers);
  return runCheck(_checkers[0]);
}
