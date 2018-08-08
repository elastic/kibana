/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Represents status that `DeauthenticationResult` can be in.
 * @enum {string}
 */
const DeauthenticationResultStatus = Object.freeze({
  /**
   * Deauthentication of the user can't be handled (e.g. provider doesn't
   * support sign out).
   */
  NotHandled: 'not-handled',

  /**
   * User has been successfully deauthenticated.
   */
  Succeeded: 'succeeded',

  /**
   * User can't be deauthenticated. Result should include the error that
   * describes the reason of failure.
   */
  Failed: 'failed',

  /**
   * Deauthentication consists of multiple steps and user should be redirected
   * to a different location to complete it.
   */
  Redirected: 'redirected'
});

/**
 * Represents the result of the deauthentication attempt.
 */
export class DeauthenticationResult {
  /**
   * Indicates the status of the deauthentication result.
   * @type {DeauthenticationResultStatus}
   * @private
   */
  _status;
  _error;
  _redirectURL;

  /**
   * Error that occurred during deauthentication (only available for `failed` result).
   * @type {?Error}
   */
  get error() {
    return this._error;
  }

  /**
   * URL that should be used to redirect user to complete authentication only available
   * for `redirected` result).
   * @type {?string}
   */
  get redirectURL() {
    return this._redirectURL;
  }

  /**
   * Constructor is not supposed to be used directly, please use corresponding static factory methods instead.
   * @private
   */
  constructor(status, { error, redirectURL } = {}) {
    this._status = status;
    this._error = error;
    this._redirectURL = redirectURL;
  }

  /**
   * Indicates that deauthentication isn't supported.
   * @returns {boolean}
   */
  notHandled() {
    return this._status === DeauthenticationResultStatus.NotHandled;
  }

  /**
   * Indicates that deauthentication succeeded.
   * @returns {boolean}
   */
  succeeded() {
    return this._status === DeauthenticationResultStatus.Succeeded;
  }

  /**
   * Indicates that deauthentication failed.
   * @returns {boolean}
   */
  failed() {
    return this._status === DeauthenticationResultStatus.Failed;
  }

  /**
   * Indicates that deauthentication needs user to be redirected.
   * @returns {boolean}
   */
  redirected() {
    return this._status === DeauthenticationResultStatus.Redirected;
  }

  /**
   * Produces `DeauthenticationResult` for the case when user deauthentication isn't supported.
   * @returns {DeauthenticationResult}
   */
  static notHandled() {
    return new DeauthenticationResult(DeauthenticationResultStatus.NotHandled);
  }

  /**
   * Produces `DeauthenticationResult` for the case when deauthentication succeeds.
   * @returns {DeauthenticationResult}
   */
  static succeeded() {
    return new DeauthenticationResult(DeauthenticationResultStatus.Succeeded);
  }

  /**
   * Produces `DeauthenticationResult` for the case when deauthentication fails.
   * @param {Error} error Error that occurred during deauthentication attempt.
   * @returns {DeauthenticationResult}
   */
  static failed(error) {
    if (!error) {
      throw new Error('Error should be specified.');
    }

    return new DeauthenticationResult(
      DeauthenticationResultStatus.Failed,
      { error }
    );
  }

  /**
   * Produces `DeauthenticationResult` for the case when deauthentication needs user to be redirected.
   * @param {string} redirectURL URL that should be used to redirect user to complete deauthentication.
   * @returns {DeauthenticationResult}
   */
  static redirectTo(redirectURL) {
    if (!redirectURL) {
      throw new Error('Redirect URL must be specified.');
    }

    return new DeauthenticationResult(
      DeauthenticationResultStatus.Redirected,
      { redirectURL }
    );
  }
}
