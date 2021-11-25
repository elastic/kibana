/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { NotFoundError } from '../../errors';

export class TrustedAppNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Trusted Application (${id}) not found`);
  }
}
export class TrustedAppPolicyNotExistsError extends Error {
  public readonly type = 'TrustedApps/PolicyNotFound';

  constructor(name: string, policyIds: string[]) {
    super(
      `Trusted Application (${name}) is assigned with a policy that no longer exists: ${policyIds.join(
        ', '
      )}`
    );
  }
}
export class TrustedAppVersionConflictError extends Error {
  constructor(id: string, public sourceError: Error) {
    super(`Trusted Application (${id}) has been updated since last retrieved`);
  }
}
