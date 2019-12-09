/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const reportingPollConfig = {
  jobCompletionNotifier: { interval: 10000, intervalErrorMultiplier: 5 },
  jobsRefresh: { interval: 5000, intervalErrorMultiplier: 5 },
};
