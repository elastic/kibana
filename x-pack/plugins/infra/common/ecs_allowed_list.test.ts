/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getAllowedListForPrefix,
  ECS_ALLOWED_LIST,
  K8S_ALLOWED_LIST,
  PROMETHEUS_ALLOWED_LIST,
  DOCKER_ALLOWED_LIST,
} from './ecs_allowed_list';
describe('getAllowedListForPrefix()', () => {
  test('kubernetes', () => {
    expect(getAllowedListForPrefix('kubernetes.pod')).toEqual([
      ...ECS_ALLOWED_LIST,
      'kubernetes.pod',
      ...K8S_ALLOWED_LIST,
    ]);
  });
  test('docker', () => {
    expect(getAllowedListForPrefix('docker.container')).toEqual([
      ...ECS_ALLOWED_LIST,
      'docker.container',
      ...DOCKER_ALLOWED_LIST,
    ]);
  });
  test('prometheus', () => {
    expect(getAllowedListForPrefix('prometheus.metrics')).toEqual([
      ...ECS_ALLOWED_LIST,
      'prometheus.metrics',
      ...PROMETHEUS_ALLOWED_LIST,
    ]);
  });
  test('anything.else', () => {
    expect(getAllowedListForPrefix('anything.else')).toEqual([
      ...ECS_ALLOWED_LIST,
      'anything.else',
    ]);
  });
});
