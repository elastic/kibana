/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type InfrastructureDashboardType = 'k8s_otel' | 'otel_on_host' | 'otel_containers';

export const existingDashboardFileNames = new Set<InfrastructureDashboardType>([
  'k8s_otel',
  'otel_on_host',
  'otel_containers',
]);

export async function loadDashboardFile(filename: InfrastructureDashboardType) {
  switch (filename) {
    case 'k8s_otel': {
      return import(
        /* webpackChunkName: "lazyK8sOtelDashboard" */
        './k8s_otel.json'
      );
    }
    case 'otel_on_host': {
      return import(
        /* webpackChunkName: "lazyOtelOnHostDashboard" */
        './otel_on_host.json'
      );
    }
    case 'otel_containers': {
      return import(
        /* webpackChunkName: "lazyOtelContainersDashboard" */
        './otel_containers.json'
      );
    }
    default: {
      return undefined;
    }
  }
}
