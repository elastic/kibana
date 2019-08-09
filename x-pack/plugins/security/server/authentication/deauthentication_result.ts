/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Represents status that `DeauthenticationResult` can be in.
 */
enum DeauthenticationResultStatus {
  /**
   * Deauthentication of the user can't be handled (e.g. provider doesn't
   * support sign out).
   */
  NotHandled = 'not-handled',

  /**
   * User has been successfully deauthenticated.
   */
  Succeeded = 'succeeded',

  /**
   * User can't be deauthenticated. Result should include the error that
   * describes the reason of failure.
   */
  Failed = 'failed',

  /**
   * Deauthentication consists of multiple steps and user should be redirected
   * to a different location to complete it.
   */
  Redirected = 'redirected',
}

/**
 * Represents additional deauthentication options.
 */
interface DeauthenticationOptions {
  error?: Error;
  redirectURL?: string;
}

/**
 * Represents the result of the deauthentication attempt.
 */
export class DeauthenticationResult {
  /**
   * Produces `DeauthenticationResult` for the case when user deauthentication isn't supported.
   */
  public static notHandled() {
    return new DeauthenticationResult(DeauthenticationResultStatus.NotHandled);
  }

  /**
   * Produces `DeauthenticationResult` for the case when deauthentication succeeds.
   */
  public static succeeded() {
    return new DeauthenticationResult(DeauthenticationResultStatus.Succeeded);
  }

  /**
   * Produces `DeauthenticationResult` for the case when deauthentication fails.
   * @param error Error that occurred during deauthentication attempt.
   */
  public static failed(error: Error) {
    if (!error) {
      throw new Error('Error should be specified.');
    }

    return new DeauthenticationResult(DeauthenticationResultStatus.Failed, { error });
  }

  /**
   * Produces `DeauthenticationResult` for the case when deauthentication needs user to be redirected.
   * @param redirectURL URL that should be used to redirect user to complete deauthentication.
   */
  public static redirectTo(redirectURL: string) {
    if (!redirectURL) {
      throw new Error('Redirect URL must be specified.');
    }

    return new DeauthenticationResult(DeauthenticationResultStatus.Redirected, { redirectURL });
  }

  /**
   * Error that occurred during deauthentication (only available for `failed` result).
   */
  public get error() {
    return this.options.error;
  }

  /**
   * URL that should be used to redirect user to complete authentication only available
   * for `redirected` result).
   */
  public get redirectURL() {
    return this.options.redirectURL;
  }

  /**
   * Constructor is not supposed to be used directly, please use corresponding static factory methods instead.
   * @param status Indicates the status of the deauthentication result.
   * @param [options] Optional argument that includes additional deauthentication options.
   */
  constructor(
    private readonly status: DeauthenticationResultStatus,
    private readonly options: DeauthenticationOptions = {}
  ) {}

  /**
   * Indicates that deauthentication isn't supported.
   */
  public notHandled() {
    return this.status === DeauthenticationResultStatus.NotHandled;
  }

  /**
   * Indicates that deauthentication succeeded.
   */
  public succeeded() {
    return this.status === DeauthenticationResultStatus.Succeeded;
  }

  /**
   * Indicates that deauthentication failed.
   */
  public failed() {
    return this.status === DeauthenticationResultStatus.Failed;
  }

  /**
   * Indicates that deauthentication needs user to be redirected.
   */
  public redirected() {
    return this.status === DeauthenticationResultStatus.Redirected;
  }
}
