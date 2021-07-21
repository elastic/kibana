/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { NotFoundError } from '../../errors';

export class EndpointHostNotFoundError extends NotFoundError {}

export class FleetAgentNotFoundError extends NotFoundError {}

export class FleetAgentPolicyNotFoundError extends NotFoundError {}
