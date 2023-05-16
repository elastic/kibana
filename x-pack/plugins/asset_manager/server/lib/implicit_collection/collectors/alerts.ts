/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Asset } from '../../../../common/types_api';
import { CollectorOptions } from '.';
import { collectHosts } from './hosts';

export async function collectAlerts({ client, from }: CollectorOptions): Promise<Asset[]> {
  const hosts = await collectHosts({ client, from });

  const alerts = hosts.flatMap((host) => {
    const alertsForHost: Asset[] = [];

    const fireThreshold = 0.1;

    // OS has outstanding security patch
    if (Math.random() < fireThreshold) {
      const alertId = `${host['asset.id']}-os-security-alert`;

      alertsForHost.push({
        '@timestamp': new Date().toISOString(),
        'asset.kind': 'alert',
        'asset.id': alertId,
        'asset.name': 'Missing security patch',
        'asset.ean': `alert:${alertId}`,
        'asset.references': [host['asset.ean']],
      });
    }

    // High CPU usage
    if (Math.random() < fireThreshold) {
      const alertId = `${host['asset.id']}-high-cpu-usage`;

      alertsForHost.push({
        '@timestamp': new Date().toISOString(),
        'asset.kind': 'alert',
        'asset.id': alertId,
        'asset.name': 'High CPU usage',
        'asset.ean': `alert:${alertId}`,
        'asset.references': [host['asset.ean']],
      });
    }

    // High Memory usage
    if (Math.random() < fireThreshold) {
      const alertId = `${host['asset.id']}-high-memory-usage`;

      alertsForHost.push({
        '@timestamp': new Date().toISOString(),
        'asset.kind': 'alert',
        'asset.id': alertId,
        'asset.name': 'High memory usage',
        'asset.ean': `alert:${alertId}`,
        'asset.references': [host['asset.ean']],
      });
    }

    // High Disk latency
    if (Math.random() < fireThreshold) {
      const alertId = `${host['asset.id']}-high-disk-latency`;

      alertsForHost.push({
        '@timestamp': new Date().toISOString(),
        'asset.kind': 'alert',
        'asset.id': alertId,
        'asset.name': 'High disk latency',
        'asset.ean': `alert:${alertId}`,
        'asset.references': [host['asset.ean']],
      });
    }

    // Low disk space left
    if (Math.random() < fireThreshold) {
      const alertId = `${host['asset.id']}-low-disk-space`;

      alertsForHost.push({
        '@timestamp': new Date().toISOString(),
        'asset.kind': 'alert',
        'asset.id': alertId,
        'asset.name': 'Low disk space',
        'asset.ean': `alert:${alertId}`,
        'asset.references': [host['asset.ean']],
      });
    }

    // Abnormal network traffic
    if (Math.random() < fireThreshold) {
      const alertId = `${host['asset.id']}-abnormal-network-traffic`;

      alertsForHost.push({
        '@timestamp': new Date().toISOString(),
        'asset.kind': 'alert',
        'asset.id': alertId,
        'asset.name': 'Abnormal network traffic',
        'asset.ean': `alert:${alertId}`,
        'asset.references': [host['asset.ean']],
      });
    }

    // Abnormal process execution
    if (Math.random() < fireThreshold) {
      const alertId = `${host['asset.id']}-abnormal-process-execution`;

      alertsForHost.push({
        '@timestamp': new Date().toISOString(),
        'asset.kind': 'alert',
        'asset.id': alertId,
        'asset.name': 'Abnormal process execution',
        'asset.ean': `alert:${alertId}`,
        'asset.references': [host['asset.ean']],
      });
    }

    return alertsForHost;
  });

  return alerts;
}
