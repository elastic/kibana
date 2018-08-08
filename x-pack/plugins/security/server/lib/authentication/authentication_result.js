/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Represents status that `AuthenticationResult` can be in.
 * @enum {string}
 */
const AuthenticationResultStatus = Object.freeze({
  /**
   * Authentication of the user can't be handled (e.g. supported credentials
   * are not provided).
   */
  NotHandled: 'not-handled',

  /**
   * User has been successfully authenticated. Result should be complemented
   * with retrieved user information and optionally with state.
   */
  Succeeded: 'succeeded',

  /**
   * User can't be authenticated with the provided credentials. Result should
   * include the error that describes the reason of failure.
   */
  Failed: 'failed',

  /**
   * Authentication consists of multiple steps and user should be redirected to
   * a different location to complete it. Can be complemented with optional state.
   */
  Redirected: 'redirected'
});

/**
 * Represents the result of an authentication attempt.
 */
export class AuthenticationResult {
  /**
   * Indicates the status of the authentication result.
   * @type {AuthenticationResultStatus}
   * @private
   */
  _status;
  _user;
  _state;
  _error;
  _redirectURL;

  /**
   * Authenticated user instance (only available for `succeeded` result).
   * @type {?Object}
   */
  get user() {
    return this._user;
  }

  /**
   * State associated with the authenticated user (only available for `succeeded`
   * and `redirected` results).
   * @type {?Object}
   */
  get state() {
    return this._state;
  }

  /**
   * Error that occurred during authentication (only available for `failed` result).
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
  constructor(status, { user, state, error, redirectURL } = {}) {
    this._status = status;
    this._user = user;
    this._state = state;
    this._error = error;
    this._redirectURL = redirectURL;
  }

  /**
   * Indicates that authentication couldn't be performed with the provided credentials.
   * @returns {boolean}
   */
  notHandled() {
    return this._status === AuthenticationResultStatus.NotHandled;
  }

  /**
   * Indicates that authentication succeeded.
   * @returns {boolean}
   */
  succeeded() {
    return this._status === AuthenticationResultStatus.Succeeded;
  }

  /**
   * Indicates that authentication failed.
   * @returns {boolean}
   */
  failed() {
    return this._status === AuthenticationResultStatus.Failed;
  }

  /**
   * Indicates that authentication needs user to be redirected.
   * @returns {boolean}
   */
  redirected() {
    return this._status === AuthenticationResultStatus.Redirected;
  }

  /**
   * Produces `AuthenticationResult` for the case when user can't be authenticated with the
   * provided credentials.
   * @returns {AuthenticationResult}
   */
  static notHandled() {
    return new AuthenticationResult(AuthenticationResultStatus.NotHandled);
  }

  /**
   * Produces `AuthenticationResult` for the case when authentication succeeds.
   * @param {Object} user User information retrieved as a result of successful authentication attempt.
   * @param {Object} [state] Optional state to be stored and reused for the next request.
   * @returns {AuthenticationResult}
   */
  static succeeded(user, state) {
    if (!user) {
      throw new Error('User should be specified.');
    }

    return new AuthenticationResult(
      AuthenticationResultStatus.Succeeded,
      { user, state }
    );
  }

  /**
   * Produces `AuthenticationResult` for the case when authentication fails.
   * @param {Error} error Error that occurred during authentication attempt.
   * @returns {AuthenticationResult}
   */
  static failed(error) {
    if (!error) {
      throw new Error('Error should be specified.');
    }

    return new AuthenticationResult(
      AuthenticationResultStatus.Failed,
      { error }
    );
  }

  /**
   * Produces `AuthenticationResult` for the case when authentication needs user to be redirected.
   * @param {string} redirectURL URL that should be used to redirect user to complete authentication.
   * @param {Object} [state] Optional state to be stored and reused for the next request.
   * @returns {AuthenticationResult}
   */
  static redirectTo(redirectURL, state) {
    if (!redirectURL) {
      throw new Error('Redirect URL must be specified.');
    }

    return new AuthenticationResult(
      AuthenticationResultStatus.Redirected,
      { redirectURL, state }
    );
  }
}
