/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

import { SecureSavedObjectsClient } from './secure_saved_objects_client';

export function secureSavedObjectsClientWrapper(baseClient, options) {
  return new SecureSavedObjectsClient({
    baseClient,
    ...options
  });
}
