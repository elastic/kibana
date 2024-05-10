/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('http://localhost/internal/bsearch', ({ request }) => {
    const response = {
      id: 0,
      result: {
        rawResponse: {
          took: 2,
          timed_out: false,
          _shards: {
            total: 1,
            successful: 1,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: 1,
            max_score: null,
            hits: [
              {
                _index: 'logs-cloud_security_posture.findings_latest-default',
                _id: 'YzCV08_2UFpCXpCkZDxGtvJAAAAAAAAA',
                _score: null,
                _source: {
                  process: {
                    args: [
                      '/usr/bin/kubelet',
                      '--cloud-provider',
                      'aws',
                      '--image-credential-provider-config',
                      '/etc/eks/ecr-credential-provider/ecr-credential-provider-config',
                      '--image-credential-provider-bin-dir',
                      '/etc/eks/ecr-credential-provider',
                      '--config',
                      '/etc/kubernetes/kubelet/kubelet-config.json',
                      '--kubeconfig',
                      '/var/lib/kubelet/kubeconfig',
                      '--container-runtime',
                      'remote',
                      '--container-runtime-endpoint',
                      'unix:///run/containerd/containerd.sock',
                      '--node-ip=10.0.3.115',
                      '--pod-infra-container-image=602401143452.dkr.ecr.eu-west-1.amazonaws.com/eks/pause:3.5',
                      '--v=2',
                      '--node-labels=eks.amazonaws.com/sourceLaunchTemplateVersion=1,eks.amazonaws.com/nodegroup-image=ami-0ae92cf6a0a5d24d0,eks.amazonaws.com/capacityType=ON_DEMAND,eks.amazonaws.com/nodegroup=cloudbeat-tf-5jA-1-20230111101512073200000014,eks.amazonaws.com/sourceLaunchTemplateId=lt-09b69718844ca28a7',
                      '--max-pods=11',
                    ],
                    parent: {
                      pid: 1,
                    },
                    pgid: 3116,
                    name: 'kubelet',
                    start: '2023-01-11T10:16:37.590Z',
                    pid: 3116,
                    args_count: 20,
                    title: 'kubelet',
                    command_line:
                      '/usr/bin/kubelet --cloud-provider aws --image-credential-provider-config /etc/eks/ecr-credential-provider/ecr-credential-provider-config --image-credential-provider-bin-dir /etc/eks/ecr-credential-provider --config /etc/kubernetes/kubelet/kubelet-config.json --kubeconfig /var/lib/kubelet/kubeconfig --container-runtime remote --container-runtime-endpoint unix:///run/containerd/containerd.sock --node-ip=10.0.3.115 --pod-infra-container-image=602401143452.dkr.ecr.eu-west-1.amazonaws.com/eks/pause:3.5 --v=2 --node-labels=eks.amazonaws.com/sourceLaunchTemplateVersion=1,eks.amazonaws.com/nodegroup-image=ami-0ae92cf6a0a5d24d0,eks.amazonaws.com/capacityType=ON_DEMAND,eks.amazonaws.com/nodegroup=cloudbeat-tf-5jA-1-20230111101512073200000014,eks.amazonaws.com/sourceLaunchTemplateId=lt-09b69718844ca28a7 --max-pods=11',
                    uptime: 41929964,
                  },
                  agent: {
                    name: 'ip-10-0-3-115.eu-west-1.compute.internal',
                    id: 'aec0e673-00e0-4a53-92da-d001d246ca98',
                    ephemeral_id: '2f2878f1-8bb7-4da0-a584-8369c92c78b0',
                    type: 'cloudbeat',
                    version: '8.13.2',
                  },
                  resource: {
                    sub_type: 'process',
                    name: 'kubelet',
                    raw: {
                      stat: {
                        UserTime: '40314423',
                        Group: '3116',
                        Parent: '1',
                        RealGID: '',
                        StartTime: '1118',
                        ResidentSize: '63524000',
                        TotalSize: '1972204000',
                        EffectiveUID: '',
                        SavedGID: '',
                        Name: 'kubelet',
                        Threads: '16',
                        RealUID: '',
                        State: 'S',
                        Nice: '0',
                        SavedUID: '',
                        EffectiveGID: '',
                        SystemTime: '20227216',
                      },
                      external_data: {},
                      pid: '3116',
                      command:
                        '/usr/bin/kubelet --cloud-provider aws --image-credential-provider-config /etc/eks/ecr-credential-provider/ecr-credential-provider-config --image-credential-provider-bin-dir /etc/eks/ecr-credential-provider --config /etc/kubernetes/kubelet/kubelet-config.json --kubeconfig /var/lib/kubelet/kubeconfig --container-runtime remote --container-runtime-endpoint unix:///run/containerd/containerd.sock --node-ip=10.0.3.115 --pod-infra-container-image=602401143452.dkr.ecr.eu-west-1.amazonaws.com/eks/pause:3.5 --v=2 --node-labels=eks.amazonaws.com/sourceLaunchTemplateVersion=1,eks.amazonaws.com/nodegroup-image=ami-0ae92cf6a0a5d24d0,eks.amazonaws.com/capacityType=ON_DEMAND,eks.amazonaws.com/nodegroup=cloudbeat-tf-5jA-1-20230111101512073200000014,eks.amazonaws.com/sourceLaunchTemplateId=lt-09b69718844ca28a7 --max-pods=11',
                    },
                    id: 'c02cb923-ca6e-56ee-88cd-c1e69a9e804a',
                    type: 'process',
                  },
                  cloud_security_posture: {
                    package_policy: {
                      id: '2f857195-dbc5-4994-a0f5-0ad3b6230bdd',
                      revision: 5,
                    },
                  },
                  elastic_agent: {
                    id: 'aec0e673-00e0-4a53-92da-d001d246ca98',
                    version: '8.13.2',
                    snapshot: false,
                  },
                  rule: {
                    references:
                      '1. https://kubernetes.io/docs/admin/kubelet/\n2. https://kubernetes.io/docs/admin/kubelet-authentication-authorization/#kubelet-authentication\n3. https://kubernetes.io/docs/tasks/administer-cluster/reconfigure-kubelet/',
                    impact: 'Anonymous requests will be rejected.',
                    description: 'Disable anonymous requests to the Kubelet server.',
                    section: 'Kubelet',
                    default_value: 'See the EKS documentation for the default value.\n',
                    rationale:
                      'When enabled, requests that are not rejected by other configured authentication methods are treated as anonymous requests.\nThese requests are then served by the Kubelet server.\nYou should rely on authentication to authorize access and disallow anonymous requests.',
                    version: '1.0',
                    benchmark: {
                      name: 'CIS Amazon Elastic Kubernetes Service (EKS)',
                      rule_number: '3.2.1',
                      id: 'cis_eks',
                      version: 'v1.0.1',
                      posture_type: 'kspm',
                    },
                    tags: ['CIS', 'EKS', 'CIS 3.2.1', 'Kubelet'],
                    remediation:
                      '**Remediation Method 1:**\n\nIf modifying the Kubelet config file, edit the kubelet-config.json file `/etc/kubernetes/kubelet/kubelet-config.json` and set the below parameter to false\n\n```\n"authentication": { "anonymous": { "enabled": false\n```\n\n**Remediation Method 2:**\n\nIf using executable arguments, edit the kubelet service file `/etc/systemd/system/kubelet.service.d/10-kubelet-args.conf` on each worker node and add the below parameter at the end of the `KUBELET_ARGS` variable string.\n\n```\n--anonymous-auth=false\n```\n\n**Remediation Method 3:**\n\nIf using the api configz endpoint consider searching for the status of `"authentication.*anonymous":{"enabled":false}"` by extracting the live configuration from the nodes running kubelet.\n\n**See detailed step-by-step configmap procedures in [Reconfigure a Node\'s Kubelet in a Live Cluster](https://kubernetes.io/docs/tasks/administer-cluster/reconfigure-kubelet/), and then rerun the curl statement from audit process to check for kubelet configuration changes\n```\nkubectl proxy --port=8001 &\n\nexport HOSTNAME_PORT=localhost:8001 (example host and port number)\nexport NODE_NAME=ip-192.168.31.226.ec2.internal (example node name from "kubectl get nodes")\n\ncurl -sSL "http://${HOSTNAME_PORT}/api/v1/nodes/${NODE_NAME}/proxy/configz"\n```\n\n**For all three remediations:**\nBased on your system, restart the `kubelet` service and check status\n\n```\nsystemctl daemon-reload\nsystemctl restart kubelet.service\nsystemctl status kubelet -l\n```',
                    audit:
                      '**Audit Method 1:**\n\nIf using a Kubelet configuration file, check that there is an entry for `authentication: anonymous: enabled` set to `false`.\n\nFirst, SSH to the relevant node:\n\nRun the following command on each node to find the appropriate Kubelet config file:\n\n```\nps -ef | grep kubelet\n```\nThe output of the above command should return something similar to `--config /etc/kubernetes/kubelet/kubelet-config.json` which is the location of the Kubelet config file.\n\nOpen the Kubelet config file:\n```\nsudo more /etc/kubernetes/kubelet/kubelet-config.json\n```\n\nVerify that the `"authentication": { "anonymous": { "enabled": false }` argument is set to `false`.\n\n\n**Audit Method 2:**\n\nIf using the api configz endpoint consider searching for the status of `authentication...\n"anonymous":{"enabled":false}` by extracting the live configuration from the nodes running kubelet.\n\nSet the local proxy port and the following variables and provide proxy port number and node name;\n`HOSTNAME_PORT="localhost-and-port-number"`\n`NODE_NAME="The-Name-Of-Node-To-Extract-Configuration" from the output of "kubectl get nodes"`\n```\nkubectl proxy --port=8001 &\n\nexport HOSTNAME_PORT=localhost:8001 (example host and port number)\nexport NODE_NAME=ip-192.168.31.226.ec2.internal (example node name from "kubectl get nodes")\n\ncurl -sSL "http://${HOSTNAME_PORT}/api/v1/nodes/${NODE_NAME}/proxy/configz"\n```',
                    name: 'Ensure that the --anonymous-auth argument is set to false',
                    id: '06635c87-1e11-59c3-9eba-b4d8a08ba899',
                    profile_applicability: '* Level 1',
                  },
                  message:
                    'Rule "Ensure that the --anonymous-auth argument is set to false": failed',
                  result: {
                    evaluation: 'failed',
                    evidence: {
                      process_args: {
                        '--cloud-provider': 'aws',
                        '--kubeconfig': '/var/lib/kubelet/kubeconfig',
                        '--container-runtime': 'remote',
                        '--image-credential-provider-bin-dir': '/etc/eks/ecr-credential-provider',
                        '--pod-infra-container-image':
                          '602401143452.dkr.ecr.eu-west-1.amazonaws.com/eks/pause:3.5',
                        '--config': '/etc/kubernetes/kubelet/kubelet-config.json',
                        '--image-credential-provider-config':
                          '/etc/eks/ecr-credential-provider/ecr-credential-provider-config',
                        '--node-ip': '10.0.3.115',
                        '--node-labels':
                          'eks.amazonaws.com/sourceLaunchTemplateVersion=1,eks.amazonaws.com/nodegroup-image=ami-0ae92cf6a0a5d24d0,eks.amazonaws.com/capacityType=ON_DEMAND,eks.amazonaws.com/nodegroup=cloudbeat-tf-5jA-1-20230111101512073200000014,eks.amazonaws.com/sourceLaunchTemplateId=lt-09b69718844ca28a7',
                        '--/usr/bin/kubelet': '',
                        '--v': '2',
                        '--max-pods': '11',
                        '--container-runtime-endpoint': 'unix:///run/containerd/containerd.sock',
                      },
                      process_config: {},
                    },
                    expected: null,
                  },
                  orchestrator: {
                    cluster: {
                      name: 'cloudbeat-tf-5jA',
                      id: 'f7ce05af-6e24-4c41-bad8-c43fe3062685',
                      version: 'v1.24.17-eks-b9c9ed7',
                    },
                    type: 'kubernetes',
                  },
                  cluster_id: 'f7ce05af-6e24-4c41-bad8-c43fe3062685',
                  '@timestamp': '2024-05-10T17:29:23.803Z',
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
                    name: 'ip-10-0-3-115.eu-west-1.compute.internal',
                  },
                  event: {
                    agent_id_status: 'auth_metadata_missing',
                    sequence: 1715362162,
                    ingested: '2024-05-10T18:22:54Z',
                    created: '2024-05-10T17:29:23.802395097Z',
                    kind: 'state',
                    id: '9cfec5e7-22a2-4e4e-929b-ba113ccc7d32',
                    type: ['info'],
                    category: ['configuration'],
                    dataset: 'cloud_security_posture.findings',
                    outcome: 'success',
                  },
                },
                sort: [1715362163803],
              },
            ],
          },
          aggregations: {
            count: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'failed',
                  doc_count: 1,
                },
              ],
            },
          },
        },
        isPartial: false,
        isRunning: false,
        requestParams: {
          method: 'POST',
          path: '/logs-cloud_security_posture.findings_latest-*/_async_search',
          querystring:
            'batched_reduce_size=64&ccs_minimize_roundtrips=true&wait_for_completion_timeout=200ms&keep_on_completion=false&keep_alive=60000ms&ignore_unavailable=false',
        },
        total: 1,
        loaded: 1,
        isRestored: false,
      },
    };

    return new HttpResponse(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }),
];
