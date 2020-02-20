/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
watch.trigger.schedule
 */
export function buildTrigger(triggerIntervalSize, triggerIntervalUnit) {
  return {
    schedule: {
      interval: `${triggerIntervalSize}${triggerIntervalUnit}`,
    },
  };
}
