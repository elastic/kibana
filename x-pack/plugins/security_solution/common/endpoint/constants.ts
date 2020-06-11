/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class IndexPattern {
  static readonly Events = 'events-endpoint-*';
  static readonly Metadata = 'metrics-endpoint.metadata-*';
  static readonly Policy = 'metrics-endpoint.policy-*';
  static readonly Telemetry = 'metrics-endpoint.telemetry-*';
}
