/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Object that represents login credentials
 * @typedef {{
 *  username: string,
 *  password: string
 * }} LoginCredentials
 */

/**
 * A LoginAttempt represents a single attempt to provide login credentials.
 * Once credentials are set, they cannot be changed.
 */
export class LoginAttempt {
  /**
   * Username and password for login
   * @type {?LoginCredentials}
   * @protected
   */
  _credentials = null;

  /**
   * Gets the username and password for this login
   * @returns {LoginCredentials}
   */
  getCredentials() {
    return this._credentials;
  }

  /**
   * Sets the username and password for this login
   * @param {string} username
   * @param {string} password
   * @returns {LoginCredentials}
   */
  setCredentials(username, password) {
    if (this._credentials) {
      throw new Error('Credentials for login attempt have already been set');
    }

    this._credentials = { username, password };
  }
}
