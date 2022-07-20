/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ErrorCode {
  CONNECTOR_DOCUMENT_ALREADY_EXISTS = 'connector_document_already_exists',
  INDEX_ALREADY_EXISTS = 'index_already_exists',
  INDEX_NOT_FOUND = 'index_not_found',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  UNAUTHORIZED = 'unauthorized',
}
