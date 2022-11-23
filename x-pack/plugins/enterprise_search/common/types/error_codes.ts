/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ErrorCode {
  ANALYTICS_COLLECTION_ALREADY_EXISTS = 'analytics_collection_already_exists',
  ANALYTICS_COLLECTION_NOT_FOUND = 'analytics_collection_not_found',
  CONNECTOR_DOCUMENT_ALREADY_EXISTS = 'connector_document_already_exists',
  CRAWLER_ALREADY_EXISTS = 'crawler_already_exists',
  DOCUMENT_NOT_FOUND = 'document_not_found',
  INDEX_ALREADY_EXISTS = 'index_already_exists',
  INDEX_NOT_FOUND = 'index_not_found',
  PIPELINE_ALREADY_EXISTS = 'pipeline_already_exists',
  PIPELINE_IS_IN_USE = 'pipeline_is_in_use',
  PIPELINE_NOT_FOUND = 'pipeline_not_found',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  UNAUTHORIZED = 'unauthorized',
  UNCAUGHT_EXCEPTION = 'uncaught_exception',
}
