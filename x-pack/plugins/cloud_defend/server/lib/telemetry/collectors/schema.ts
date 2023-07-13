/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { CloudDefendUsage } from './types';

export const cloudDefendUsageSchema: MakeSchemaFrom<CloudDefendUsage> = {
  indices: {
    alerts: {
      doc_count: {
        type: 'long',
      },
      deleted: {
        type: 'long',
      },
      size_in_bytes: {
        type: 'long',
      },
      last_doc_timestamp: {
        type: 'date',
      },
    },
    file: {
      doc_count: {
        type: 'long',
      },
      deleted: {
        type: 'long',
      },
      size_in_bytes: {
        type: 'long',
      },
      last_doc_timestamp: {
        type: 'date',
      },
    },
    process: {
      doc_count: {
        type: 'long',
      },
      deleted: {
        type: 'long',
      },
      size_in_bytes: {
        type: 'long',
      },
      last_doc_timestamp: {
        type: 'date',
      },
    },
    latestPackageVersion: { type: 'keyword' },
    packageStatus: {
      status: { type: 'keyword' },
      installedPackagePolicies: { type: 'long' },
      healthyAgents: { type: 'long' },
    },
  },
  pods_stats: {
    type: 'array',
    items: {
      account_id: { type: 'keyword' },
      container_image_name: { type: 'keyword' },
      container_image_tag: { type: 'keyword' },
      cloud_provider: { type: 'keyword' },
      pod_name: { type: 'keyword' },
      process_doc_count: { type: 'long' },
      file_doc_count: { type: 'long' },
      alert_doc_count: { type: 'long' },
    },
  },
  accounts_stats: {
    type: 'array',
    items: {
      account_id: { type: 'keyword' },
      total_doc_count: { type: 'long' },
      file_doc_count: { type: 'long' },
      process_doc_count: { type: 'long' },
      alert_doc_count: { type: 'long' },
      kubernetes_version: { type: 'keyword' },
      agents_count: { type: 'short' },
      nodes_count: { type: 'short' },
      pods_count: { type: 'short' },
    },
  },
  installation_stats: {
    type: 'array',
    items: {
      package_policy_id: { type: 'keyword' },
      package_version: { type: 'keyword' },
      agent_policy_id: { type: 'keyword' },
      created_at: { type: 'date' },
      agent_count: { type: 'long' },
      policy_yaml_stats: {
        policy_yaml: { type: 'keyword' },
        policy_json: { type: 'keyword' }, // in DBT BQ land, this will be stored as a JSON type so we can run analytic queries on cloud_defend policy behavior
        selector_counts: {
          file: { type: 'long' },
          process: { type: 'long' },
        },
        response_counts: {
          file: { type: 'long' },
          process: { type: 'long' },
        },
        conditions_in_use: {
          containerImageFullName: { type: 'long' },
          containerImageName: { type: 'long' },
          containerImageTag: { type: 'long' },
          ignoreVolumeFiles: { type: 'long' },
          ignoreVolumeMounts: { type: 'long' },
          kubernetesClusterId: { type: 'long' },
          kubernetesClusterName: { type: 'long' },
          kubernetesNamespace: { type: 'long' },
          kubernetesPodLabel: { type: 'long' },
          kubernetesPodName: { type: 'long' },
          operation: { type: 'long' },
          processExecutable: { type: 'long' },
          processName: { type: 'long' },
          sessionLeaderInteractive: { type: 'long' },
          targetFilePath: { type: 'long' },
        },
        actions_in_use: {
          log: { type: 'long' },
          alert: { type: 'long' },
          block: { type: 'long' },
        },
      },
    },
  },
};
