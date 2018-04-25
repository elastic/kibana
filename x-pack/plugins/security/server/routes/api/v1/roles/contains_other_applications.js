/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */
export function containsOtherApplications(role, ourApplication) {
  if (!role.applications || role.applications.length === 0) {
    return false;
  }

  return role.applications.some(x => x.application !== ourApplication);
}
