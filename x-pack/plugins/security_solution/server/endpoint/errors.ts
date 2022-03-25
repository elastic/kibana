/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { EndpointError } from '../../common/endpoint/errors';

export class NotFoundError extends EndpointError {}

export class EndpointAppContentServicesNotSetUpError extends EndpointError {
  constructor() {
    super('EndpointAppContextService has not been set up (EndpointAppContextService.setup())');
  }
}

export class EndpointAppContentServicesNotStartedError extends EndpointError {
  constructor() {
    super('EndpointAppContextService has not been started (EndpointAppContextService.start())');
  }
}
export class EndpointLicenseError extends EndpointError {
  constructor() {
    super('Your license level does not allow for this action.');
  }
}

export class EndpointAuthorizationError extends EndpointError {
  constructor(meta?: unknown) {
    super('Endpoint authorization failure', meta);
  }
}
