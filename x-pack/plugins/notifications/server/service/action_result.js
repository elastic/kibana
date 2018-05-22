/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Action Results represent generic, predictable responses from Actions.
 */
export class ActionResult {

  /**
   * Create a new Action Result.
   *
   * Success is determined by the existence of an error.
   *
   * @param {String} message The message to display about the result, presumably in a Toast.
   * @param {Object|undefined} response The response from the "other" side.
   * @param {Object|undefined} error The error, if any.
   */
  constructor({ message, response, error }) {
    this.message = message;
    this.response = response;
    this.error = error;
    this.ok = !Boolean(error);
  }

  /**
   * Get the error caused by the action.
   *
   * @returns {Object|undefined} The error response, or {@code undefined} if no error.
   */
  getError() {
    return this.error;
  }

  /**
   * Get the message displayable to the user.
   *
   * @returns {String} The message.
   */
  getMessage() {
    return this.message;
  }

  /**
   * The raw JSON response from the action.
   *
   * @returns {Object|undefined} The JSON response.
   */
  getResponse() {
    return this.response;
  }

  /**
   * Determine if the action succeeded.
   *
   * @returns {Boolean} {@code true} for success.
   */
  isOk() {
    return this.ok;
  }

  toJson() {
    return {
      ok: this.ok,
      error: this.error,
      message: this.message,
      response: this.response,
    };
  }

}
