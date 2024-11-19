/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const createKubernetesEntity = <T extends string>(base: T) => ({
  ecs: `kubernetes_${base}_ecs` as const,
  semconv: `kubernetes_${base}_semconv` as const,
});

export const ENTITY_TYPES = {
  HOST: 'host',
  CONTAINER: 'container',
  SERVICE: 'service',
  KUBERNETES: {
    CLUSTER: createKubernetesEntity('cluster'),
    CONTAINER: createKubernetesEntity('container'),
    CRONJOB: createKubernetesEntity('cron_job'),
    DAEMONSET: createKubernetesEntity('daemon_set'),
    DEPLOYMENT: createKubernetesEntity('deployment'),
    JOB: createKubernetesEntity('job'),
    NAMESPACE: createKubernetesEntity('namespace'),
    NODE: createKubernetesEntity('node'),
    POD: createKubernetesEntity('pod'),
    STATEFULSET: createKubernetesEntity('stateful_set'),
  },
} as const;
