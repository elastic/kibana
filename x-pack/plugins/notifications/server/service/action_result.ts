/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Action Results represent generic, predictable responses from Actions.
 */
export class ActionResult {
  private message: string;
  private response: any;
  private error: any;

  /**
   * Create a new Action Result.
   *
   * Success is determined by the existence of an error.
   *
   * @param {String} message The message to display about the result, presumably in a Toast.
   * @param {Object|undefined} response The response from the "other" side.
   * @param {Object|undefined} error The error, if any.
   */
  constructor({ message, response, error }: { message: string; response?: any; error?: any }) {
    this.message = message;
    this.response = response;
    this.error = error;
  }

  /**
   * Get the error caused by the action.
   *
   * @returns {Object|undefined} The error response, or {@code undefined} if no error.
   */
  public getError() {
    return this.error;
  }

  /**
   * Get the message displayable to the user.
   *
   * @returns {String} The message.
   */
  public getMessage(): string {
    return this.message;
  }

  /**
   * The raw JSON response from the action.
   *
   * @returns {Object|undefined} The JSON response.
   */
  public getResponse() {
    return this.response;
  }

  /**
   * Determine if the action succeeded.
   *
   * @returns {Boolean} {@code true} for success.
   */
  public isOk(): boolean {
    return !Boolean(this.error);
  }

  public toJson() {
    return {
      ok: this.isOk(),
      error: this.error,
      message: this.message,
      response: this.response,
    };
  }
}
