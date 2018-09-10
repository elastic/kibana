/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraNodeMetricFn, InfraNodeType } from '../adapter_types';

const FIELDS = {
  [InfraNodeType.host]: 'system.cpu.user.pct',
  [InfraNodeType.pod]: 'kubernetes.pod.cpu.usage.node.pct',
  [InfraNodeType.container]: 'docker.cpu.user.pct',
};

export const cpu: InfraNodeMetricFn = (nodeType: InfraNodeType) => {
  const field = FIELDS[nodeType];
  return { cpu: { avg: { field } } };
};
