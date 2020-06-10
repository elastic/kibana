/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function findNewUuid(oldUuids, newUuids) {
  for (const newUuid of newUuids) {
    if (oldUuids.indexOf(newUuid) === -1) {
      return newUuid;
    }
  }
}
