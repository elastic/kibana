/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Best effort to get instance size from process.env
export function readInstanceSizeMb(): undefined | number {
  const capacityString = process.env.CLOUD_KIBANA_CAPACITY;
  if (capacityString) {
    const instanceSizeMb = parseInt(capacityString, 10);
    return isNaN(instanceSizeMb) ? undefined : instanceSizeMb;
  }
}
