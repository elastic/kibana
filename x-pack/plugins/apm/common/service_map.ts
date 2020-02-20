/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ServiceConnectionNode {
  'service.name': string;
  'service.environment': string | null;
  'agent.name': string;
}
export interface ExternalConnectionNode {
  'destination.address': string;
  'span.type': string;
  'span.subtype': string;
}

export type ConnectionNode = ServiceConnectionNode | ExternalConnectionNode;

export interface Connection {
  source: ConnectionNode;
  destination: ConnectionNode;
}
