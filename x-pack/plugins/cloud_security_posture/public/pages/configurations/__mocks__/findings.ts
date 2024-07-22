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
  data_stream: {
    dataset: 'cloud_security_posture.findings',
  },
};

export const mockWizFinding = {
  agent: {
    name: 'ip-172-31-29-186.eu-west-1.compute.internal',
    id: 'd66400e6-6224-489a-aae5-0dd529e7b61a',
    ephemeral_id: '3159ed3a-8517-4289-9c4c-ab15abc7f938',
    type: 'filebeat',
    version: '8.14.1',
  },
  resource: {
    name: 'annam-instance-group-61wh',
    id: '45860879-12db-5fce-838d-eb4deac2a544',
  },
  elastic_agent: {
    id: 'd66400e6-6224-489a-aae5-0dd529e7b61a',
    version: '8.14.1',
    snapshot: false,
  },
  wiz: {
    cloud_configuration_finding: {
      rule: {
        id: '02fde46d-ba1c-405e-b20f-a3742a8d2f41',
      },
    },
  },
  rule: {
    name: 'Unattached volume for more than 7 days',
    id: '02fde46d-ba1c-405e-b20f-a3742a8d2f41',
  },
  message:
    "This rule checks if Compute Disks have been unattached for more than 7 days.  \nThis rule fails if a disk's status is `READY`, it has no users attached, and the `lastDetachTimestamp` is more than 7 days ago.  \nUnattached disks can incur costs without providing any benefits and may also pose a security risk if they contain sensitive data that is not being used. It is recommended to either delete unattached disks that are no longer needed or reattach them to a relevant instance.",
  tags: ['preserve_original_event', 'forwarded', 'wiz-cloud_configuration_finding'],
  cloud: {
    availability_zone: 'eu-west-1b',
    image: {
      id: 'ami-0551ce4d67096d606',
    },
    instance: {
      id: 'i-0d3beee17a99bf575',
    },
    provider: 'GCP',
    service: {
      name: 'EC2',
    },
    machine: {
      type: 't2.micro',
    },
    region: 'us-central1',
    account: {
      id: '704479110758',
    },
  },
  input: {
    type: 'cel',
  },
  '@timestamp': '2024-07-15T10:00:16.283Z',
  ecs: {
    version: '8.11.0',
  },
  data_stream: {
    namespace: 'default',
    type: 'logs',
    dataset: 'wiz.cloud_configuration_finding',
  },
  event: {
    agent_id_status: 'auth_metadata_missing',
    ingested: '2024-07-15T10:49:45Z',
    original:
      '{"analyzedAt":"2024-07-15T10:00:16.283504Z","firstSeenAt":"2024-07-15T10:00:22.271901Z","id":"fd5b53a4-d85c-5d3a-b0bf-2eb270582db5","ignoreRules":null,"remediation":null,"resource":{"id":"45860879-12db-5fce-838d-eb4deac2a544","name":"annam-instance-group-61wh","nativeType":"compute#disk","projects":[{"id":"0f19bcc4-c17b-57d0-a187-db3a6b1a5100","name":"Project 3","riskProfile":{"businessImpact":"MBI"}}],"providerId":"https://www.googleapis.com/compute/v1/projects/my-walla-website/zones/us-central1-c/disks/annam-instance-group-61wh","region":"us-central1","subscription":{"cloudProvider":"GCP","externalId":"my-walla-website","id":"64982819-64ed-5c02-8a73-93d25fef8d89","name":"Product Integration"},"tags":[],"type":"VOLUME"},"result":"PASS","rule":{"description":"This rule checks if Compute Disks have been unattached for more than 7 days.  \\nThis rule fails if a disk\'s status is `READY`, it has no users attached, and the `lastDetachTimestamp` is more than 7 days ago.  \\nUnattached disks can incur costs without providing any benefits and may also pose a security risk if they contain sensitive data that is not being used. It is recommended to either delete unattached disks that are no longer needed or reattach them to a relevant instance.","functionAsControl":false,"graphId":"60db4cc3-d5c8-5e76-8dc9-77dde142ba98","id":"02fde46d-ba1c-405e-b20f-a3742a8d2f41","name":"Unattached volume for more than 7 days","remediationInstructions":"Perform the following step in order to delete a disk via GCP CLI:  \\n```  \\ngcloud compute disks delete {{DiskName}} --zone={{Zone}}\\n```  \\n\\u003e**Note**  \\n\\u003eA disk can only be deleted  if it is not attached to any virtual machine instances."},"securitySubCategories":[{"category":{"framework":{"id":"wf-id-120","name":"NIS2 Directive (Article 21)"},"id":"wct-id-2418","name":"Article 21 Cybersecurity risk-management measures"},"id":"wsct-id-18827","title":"21.2.1 The measures to protect network and information systems shall include policies on risk analysis and information system security"},{"category":{"framework":{"id":"wf-id-105","name":"Wiz (Legacy)"},"id":"wct-id-2136","name":"Operationalization"},"id":"wsct-id-5540","title":"Operationalization"},{"category":{"framework":{"id":"wf-id-1","name":"Wiz for Risk Assessment"},"id":"wct-id-940","name":"Operationalization"},"id":"wsct-id-6548","title":"Operationalization"},{"category":{"framework":{"id":"wf-id-78","name":"Wiz for Cost Optimization"},"id":"wct-id-1796","name":"Waste"},"id":"wsct-id-10216","title":"Storage"}],"severity":"NONE","status":"RESOLVED","targetExternalId":"1404039754344376914","targetObjectProviderUniqueId":"https://www.googleapis.com/compute/v1/projects/my-walla-website/zones/us-central1-c/disks/annam-instance-group-61wh"}',
    created: '2024-07-15T10:00:22.271Z',
    kind: 'event',
    id: 'fd5b53a4-d85c-5d3a-b0bf-2eb270582db5',
    category: ['configuration'],
    type: ['info'],
    dataset: 'wiz.cloud_configuration_finding',
  },
};
