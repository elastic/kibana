/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Indicates whether which user action field is being parsed, the new_value or the old_value.
 */
export enum UserActionFieldType {
  New = 'New',
  Old = 'Old',
}
