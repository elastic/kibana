/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useLatestFindings } from './use_latest_findings';
import { server } from '../__mocks__/node';
import { IntegrationTestProvider } from '../../../test/integration_test_provider';

server.events.on('request:start', ({ request }) => {
  console.log('MSW intercepted:', request.method, request.url);
});

beforeAll(() =>
  server.listen({
    onUnhandledRequest: 'warn',
  })
);
afterAll(() => server.close());
beforeEach(() => {
  server.resetHandlers();
});

const wrapper = ({ children }: { children: React.ReactNode }) => {
  return <IntegrationTestProvider>{children}</IntegrationTestProvider>;
};

test('useLatestFindings fetches data correctly', async () => {
  const { result, waitFor } = renderHook(
    () =>
      useLatestFindings({
        query: {
          bool: {
            must: [],
            filter: [],
            should: [],
            must_not: [],
          },
        },
        sort: [['@timestamp', 'desc']],
        enabled: true,
        pageSize: 25,
      }),
    { wrapper }
  );

  // await waitForNextUpdate();
  // console.log(result.current.data);
  await waitFor(() => result.current.data !== undefined, { timeout: 10000 });

  expect(result.current?.data).toEqual({
    pages: [
      {
        page: [
          {
            id: 'logs-cloud_security_posture.findings_latest-default::M2HvyQyaX-4hPEqZTNrkjvegAAAAAAAA::',
            raw: {
              _index: 'logs-cloud_security_posture.findings_latest-default',
              _id: 'M2HvyQyaX-4hPEqZTNrkjvegAAAAAAAA',
              _score: null,
              _source: {
                agent: {
                  name: 'kind-multi-control-plane',
                  id: '564402d7-9715-4f5b-aa3a-b1ad7800d1e1',
                  ephemeral_id: 'b45b8a81-a202-4fda-a831-e3da807b6548',
                  type: 'cloudbeat',
                  version: '8.13.2',
                },
                resource: {
                  sub_type: 'ServiceAccount',
                  name: 'replicaset-controller',
                  raw: {
                    metadata: {
                      uid: '83819d45-e99c-4fe8-bc59-fd650731922a',
                      resourceVersion: '309',
                      creationTimestamp: '2024-04-10T08:41:36Z',
                      name: 'replicaset-controller',
                      namespace: 'kube-system',
                    },
                    apiVersion: 'v1',
                    kind: 'ServiceAccount',
                    secrets: [
                      {
                        name: 'replicaset-controller-token-8z9vp',
                      },
                    ],
                  },
                  id: '3dcd461e-4f16-50d9-8f55-30a510bbc587',
                  type: 'k8s_object',
                },
                cloud_security_posture: {
                  package_policy: {
                    id: '16aec061-cb66-472d-956a-51a23bcea333',
                    revision: 5,
                  },
                },
                elastic_agent: {
                  id: '564402d7-9715-4f5b-aa3a-b1ad7800d1e1',
                  version: '8.13.2',
                  snapshot: false,
                },
                rule: {
                  references:
                    '1. https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/',
                  impact:
                    'All workloads which require access to the Kubernetes API will require an explicit service account to be created.',
                  description:
                    'The `default` service account should not be used to ensure that rights granted to applications can be more easily audited and reviewed.',
                  section: 'RBAC and Service Accounts',
                  default_value:
                    'By default the `default` service account allows for its service account token\nto be mounted\nin pods in its namespace.\n',
                  rationale:
                    'Kubernetes provides a `default` service account which is used by cluster workloads where no specific service account is assigned to the pod.\n\nWhere access to the Kubernetes API from a pod is required, a specific service account should be created for that pod, and rights granted to that service account.\n\nThe default service account should be configured such that it does not provide a service account token and does not have any explicit rights assignments.',
                  version: '1.0',
                  benchmark: {
                    name: 'CIS Kubernetes V1.23',
                    rule_number: '5.1.5',
                    id: 'cis_k8s',
                    version: 'v1.0.1',
                    posture_type: 'kspm',
                  },
                  tags: ['CIS', 'Kubernetes', 'CIS 5.1.5', 'RBAC and Service Accounts'],
                  remediation:
                    'Create explicit service accounts wherever a Kubernetes workload requires specific access to the Kubernetes API server.\n\nModify the configuration of each default service account to include this value \n\n```\nautomountServiceAccountToken: false\n```',
                  audit:
                    'For each namespace in the cluster, review the rights assigned to the default service account and ensure that it has no roles or cluster roles bound to it apart from the defaults.\n\nAdditionally ensure that the `automountServiceAccountToken: false` setting is in place for each default service account.',
                  name: 'Ensure that default service accounts are not actively used.',
                  id: 'a97eb244-d583-528c-a49a-17b0aa14decd',
                  profile_applicability: '* Level 1 - Master Node',
                },
                message:
                  'Rule "Ensure that default service accounts are not actively used.": passed',
                result: {
                  evaluation: 'passed',
                  evidence: {
                    serviceAccounts: [],
                    serviceAccount: [],
                  },
                  expected: null,
                },
                orchestrator: {
                  cluster: {
                    name: 'kind-multi',
                    id: 'db550994-03ed-4654-89c6-5f09c8ea4ec2',
                    version: 'v1.23.12',
                  },
                  resource: {
                    name: 'replicaset-controller',
                    id: '83819d45-e99c-4fe8-bc59-fd650731922a',
                    type: 'ServiceAccount',
                  },
                  type: 'kubernetes',
                },
                cluster_id: 'db550994-03ed-4654-89c6-5f09c8ea4ec2',
                '@timestamp': '2024-04-30T01:59:28.450Z',
                ecs: {
                  version: '8.6.0',
                },
                cloudbeat: {
                  commit_time: '0001-01-01T00:00:00Z',
                  version: '8.13.2',
                  policy: {
                    commit_time: '0001-01-01T00:00:00Z',
                    version: '8.13.2',
                  },
                },
                data_stream: {
                  namespace: 'default',
                  type: 'logs',
                  dataset: 'cloud_security_posture.findings',
                },
                host: {
                  name: 'kind-multi-control-plane',
                },
                event: {
                  agent_id_status: 'auth_metadata_missing',
                  sequence: 1714442366,
                  ingested: '2024-04-30T04:55:18Z',
                  kind: 'state',
                  created: '2024-04-30T01:59:28.450213139Z',
                  id: 'b6837522-52f1-40ea-99ed-b8a70e66bcec',
                  type: ['info'],
                  category: ['configuration'],
                  dataset: 'cloud_security_posture.findings',
                  outcome: 'success',
                },
              },
              sort: [1714442368450],
            },
            flattened: {
              '@timestamp': '2024-04-30T01:59:28.450Z',
              'agent.ephemeral_id': 'b45b8a81-a202-4fda-a831-e3da807b6548',
              'agent.id': '564402d7-9715-4f5b-aa3a-b1ad7800d1e1',
              'agent.name': 'kind-multi-control-plane',
              'agent.type': 'cloudbeat',
              'agent.version': '8.13.2',
              'cloud_security_posture.package_policy.id': '16aec061-cb66-472d-956a-51a23bcea333',
              'cloud_security_posture.package_policy.revision': 5,
              'cloudbeat.commit_time': '0001-01-01T00:00:00Z',
              'cloudbeat.policy.commit_time': '0001-01-01T00:00:00Z',
              'cloudbeat.policy.version': '8.13.2',
              'cloudbeat.version': '8.13.2',
              cluster_id: 'db550994-03ed-4654-89c6-5f09c8ea4ec2',
              'data_stream.dataset': 'cloud_security_posture.findings',
              'data_stream.namespace': 'default',
              'data_stream.type': 'logs',
              'ecs.version': '8.6.0',
              'elastic_agent.id': '564402d7-9715-4f5b-aa3a-b1ad7800d1e1',
              'elastic_agent.snapshot': false,
              'elastic_agent.version': '8.13.2',
              'event.agent_id_status': 'auth_metadata_missing',
              'event.category': ['configuration'],
              'event.created': '2024-04-30T01:59:28.450213139Z',
              'event.dataset': 'cloud_security_posture.findings',
              'event.id': 'b6837522-52f1-40ea-99ed-b8a70e66bcec',
              'event.ingested': '2024-04-30T04:55:18Z',
              'event.kind': 'state',
              'event.outcome': 'success',
              'event.sequence': 1714442366,
              'event.type': ['info'],
              'host.name': 'kind-multi-control-plane',
              message: 'Rule "Ensure that default service accounts are not actively used.": passed',
              'orchestrator.cluster.id': 'db550994-03ed-4654-89c6-5f09c8ea4ec2',
              'orchestrator.cluster.name': 'kind-multi',
              'orchestrator.cluster.version': 'v1.23.12',
              'orchestrator.resource.id': '83819d45-e99c-4fe8-bc59-fd650731922a',
              'orchestrator.resource.name': 'replicaset-controller',
              'orchestrator.resource.type': 'ServiceAccount',
              'orchestrator.type': 'kubernetes',
              'resource.id': '3dcd461e-4f16-50d9-8f55-30a510bbc587',
              'resource.name': 'replicaset-controller',
              'resource.raw.apiVersion': 'v1',
              'resource.raw.kind': 'ServiceAccount',
              'resource.raw.metadata.creationTimestamp': '2024-04-10T08:41:36Z',
              'resource.raw.metadata.name': 'replicaset-controller',
              'resource.raw.metadata.namespace': 'kube-system',
              'resource.raw.metadata.resourceVersion': '309',
              'resource.raw.metadata.uid': '83819d45-e99c-4fe8-bc59-fd650731922a',
              'resource.raw.secrets': [
                {
                  name: 'replicaset-controller-token-8z9vp',
                },
              ],
              'resource.sub_type': 'ServiceAccount',
              'resource.type': 'k8s_object',
              'result.evaluation': 'passed',
              'result.evidence.serviceAccount': [],
              'result.evidence.serviceAccounts': [],
              'result.expected': null,
              'rule.audit':
                'For each namespace in the cluster, review the rights assigned to the default service account and ensure that it has no roles or cluster roles bound to it apart from the defaults.\n\nAdditionally ensure that the `automountServiceAccountToken: false` setting is in place for each default service account.',
              'rule.benchmark.id': 'cis_k8s',
              'rule.benchmark.name': 'CIS Kubernetes V1.23',
              'rule.benchmark.posture_type': 'kspm',
              'rule.benchmark.rule_number': '5.1.5',
              'rule.benchmark.version': 'v1.0.1',
              'rule.default_value':
                'By default the `default` service account allows for its service account token\nto be mounted\nin pods in its namespace.\n',
              'rule.description':
                'The `default` service account should not be used to ensure that rights granted to applications can be more easily audited and reviewed.',
              'rule.id': 'a97eb244-d583-528c-a49a-17b0aa14decd',
              'rule.impact':
                'All workloads which require access to the Kubernetes API will require an explicit service account to be created.',
              'rule.name': 'Ensure that default service accounts are not actively used.',
              'rule.profile_applicability': '* Level 1 - Master Node',
              'rule.rationale':
                'Kubernetes provides a `default` service account which is used by cluster workloads where no specific service account is assigned to the pod.\n\nWhere access to the Kubernetes API from a pod is required, a specific service account should be created for that pod, and rights granted to that service account.\n\nThe default service account should be configured such that it does not provide a service account token and does not have any explicit rights assignments.',
              'rule.references':
                '1. https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/',
              'rule.remediation':
                'Create explicit service accounts wherever a Kubernetes workload requires specific access to the Kubernetes API server.\n\nModify the configuration of each default service account to include this value \n\n```\nautomountServiceAccountToken: false\n```',
              'rule.section': 'RBAC and Service Accounts',
              'rule.tags': ['CIS', 'Kubernetes', 'CIS 5.1.5', 'RBAC and Service Accounts'],
              'rule.version': '1.0',
            },
          },
        ],
        total: 1,
        count: {
          passed: 1,
          failed: 0,
        },
      },
    ],
    pageParams: [null],
  });
}, 10000);
