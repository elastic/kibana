/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const defaultSourceConfiguration = {
  name: 'Default',
  description: '',
  metricAlias: 'metricbeat-*',
  logAlias: 'filebeat-*',
  fields: {
    container: 'docker.container.id',
    host: 'host.name',
    pod: 'kubernetes.pod.uid',
    tiebreaker: '_doc',
    timestamp: '@timestamp',
  },
};
