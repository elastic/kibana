/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CspFinding } from '../../../../common/schemas/csp_finding';

export const mockFindingsHit: CspFinding = {
  result: {
    evaluation: 'passed',
    evidence: {
      serviceAccounts: [],
      serviceAccount: [],
    },
    // TODO: wrong type
    // expected: null,
  },
  orchestrator: {
    cluster: {
      name: 'kind-multi',
    },
  },
  agent: {
    name: 'kind-multi-worker',
    id: '41b2ba39-fd4e-474d-8c61-d79c9204e793',
    // TODO: missing
    // ephemeral_id: '20964f94-a4fe-48c1-8bf3-4b7140baf03c',
    type: 'cloudbeat',
    version: '8.6.0',
  },
  cluster_id: '087606d6-c71a-4892-9b27-67ab937770ce',
  '@timestamp': '2022-11-24T22:27:19.515Z',
  ecs: {
    version: '8.0.0',
  },
  resource: {
    sub_type: 'ServiceAccount',
    name: 'certificate-controller',
    raw: {
      metadata: {
        uid: '597cd43e-90a5-4aea-95aa-35f177429794',
        resourceVersion: '277',
        creationTimestamp: '2022-11-15T16:08:49Z',
        name: 'certificate-controller',
        namespace: 'kube-system',
      },
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      secrets: [
        {
          name: 'certificate-controller-token-ql8wn',
        },
      ],
    },
    id: '597cd43e-90a5-4aea-95aa-35f177429794',
    type: 'k8s_object',
  },
  host: {
    id: '', // TODO: missing
    hostname: 'kind-multi-worker',
    os: {
      kernel: '5.10.76-linuxkit',
      codename: 'bullseye',
      name: 'Debian GNU/Linux',
      type: 'linux',
      family: 'debian',
      version: '11 (bullseye)',
      platform: 'debian',
    },
    containerized: false,
    ip: ['172.19.0.3', 'fc00:f853:ccd:e793::3', 'fe80::42:acff:fe13:3'],
    name: 'kind-multi-worker',
    mac: ['02-42-AC-13-00-03'],
    architecture: 'x86_64',
  },
  rule: {
    references:
      '1. [https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)\n',
    impact:
      'All workloads which require access to the Kubernetes API will require an explicit service account to be created.\n',
    description:
      'The `default` service account should not be used to ensure that rights granted to applications can be more easily audited and reviewed.\n',
    default_value:
      'By default the `default` service account allows for its service account token\nto be mounted\nin pods in its namespace.\n',
    section: 'RBAC and Service Accounts',
    rationale:
      'Kubernetes provides a `default` service account which is used by cluster workloads where no specific service account is assigned to the pod. Where access to the Kubernetes API from a pod is required, a specific service account should be created for that pod, and rights granted to that service account. The default service account should be configured such that it does not provide a service account token and does not have any explicit rights assignments.\n',
    version: '1.0',
    benchmark: {
      rule_number: '1.1.1',
      name: 'CIS Kubernetes V1.23',
      id: 'cis_k8s',
      version: 'v1.0.0',
    },
    tags: ['CIS', 'Kubernetes', 'CIS 5.1.5', 'RBAC and Service Accounts'],
    remediation:
      'Create explicit service accounts wherever a Kubernetes workload requires\nspecific access\nto the Kubernetes API server.\nModify the configuration of each default service account to include this value\n```\nautomountServiceAccountToken: false\n```\n',
    audit:
      'For each namespace in the cluster, review the rights assigned to the default service account and ensure that it has no roles or cluster roles bound to it apart from the defaults. Additionally ensure that the `automountServiceAccountToken: false` setting is in place for each default service account.\n',
    name: 'Ensure that default service accounts are not actively used. (Manual)',
    id: '2b399496-f79d-5533-8a86-4ea00b95e3bd',
    profile_applicability: '* Level 1 - Master Node\n',
    rego_rule_id: '',
  },
  event: {
    agent_id_status: 'auth_metadata_missing',
    sequence: 1669328831,
    ingested: '2022-11-24T22:28:25Z',
    created: '2022-11-24T22:27:19.514650003Z',
    kind: 'state',
    id: 'ce5c1501-90a3-4543-bf28-cd6c9e4d73e8',
    type: ['info'],
    category: ['configuration'],
    outcome: 'success',
  },
};
