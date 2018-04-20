/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function sortableBoolean(val) {
  const boolVal = Boolean(val);

  return {
    value: boolVal,
    sortOrder: boolVal ? -1 : 0
  };
}
