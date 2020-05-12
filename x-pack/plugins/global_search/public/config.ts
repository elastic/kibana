/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface GlobalSearchConfigType {
  search_timeout: string; // TODO: check type as it's a duration on the server
}
