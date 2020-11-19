/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface AuditMessageBase {
  message: string;
  level: string;
  timestamp: number;
  node_name: string;
  text?: string;
}

export interface AuditMessage {
  _index: string;
  _type: string;
  _id: string;
  _score: null | number;
  _source: TransformMessage;
  sort?: any;
}

export interface TransformMessage extends AuditMessageBase {
  transform_id: string;
}
