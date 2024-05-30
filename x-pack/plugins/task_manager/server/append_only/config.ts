/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const config = {
  tasksIndex: '.kibana_task',
  taskScheduleIndex: '.kibana_task_schedule',
  numOfShards: 1,
  numOfReplicas: 0,
  claimInterval: 500,
  workerConcurrency: 50,
  claimPageMultiplier: 8,
  numRecordsToPopulate: 10000,
  lockTimeout: 'now-5m',
  updateInstancesInterval: 3000,
  esUrl: 'http://elastic:changeme@localhost:9200',
  heartbeatInterval: 3000,
};
