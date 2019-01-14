/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const formatDuration = (duration: number | undefined): number => {
  if (duration === undefined) {
    return 0;
  }
  // TODO: formatting should not be performed this way, remove bare number
  return isNaN(duration) ? 0 : duration / 1000;
};
