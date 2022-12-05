/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ENDPOINT_ACTION_RESPONSES_DS, ENDPOINT_ACTIONS_DS } from '../constants';
import { BaseDataGenerator } from './base_data_generator';
import type {
  ActionDetails,
  EndpointActivityLogAction,
  EndpointActivityLogActionResponse,
  EndpointPendingActions,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  ProcessesEntry,
  EndpointActionDataParameterTypes,
  ActionResponseOutput,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
} from '../types';
import { ActivityLogItemTypes } from '../types';
import { RESPONSE_ACTION_API_COMMANDS_NAMES } from '../service/response_actions/constants';

export class EndpointActionGenerator extends BaseDataGenerator {
  /** Generate a random endpoint Action request (isolate or unisolate) */
  generate(overrides: DeepPartial<LogsEndpointAction> = {}): LogsEndpointAction {
    const timeStamp = overrides['@timestamp'] ? new Date(overrides['@timestamp']) : new Date();

    return merge(
      {
        '@timestamp': timeStamp.toISOString(),
        agent: {
          id: [this.seededUUIDv4()],
        },
        EndpointActions: {
          action_id: this.seededUUIDv4(),
          expiration: this.randomFutureDate(timeStamp),
          type: 'INPUT_ACTION',
          input_type: 'endpoint',
          data: {
            command: this.randomResponseActionCommand(),
            comment: this.randomString(15),
            parameters: undefined,
          },
        },
        error: undefined,
        user: {
          id: this.randomUser(),
        },
      },
      overrides
    );
  }

  generateActionEsHit(
    overrides: DeepPartial<LogsEndpointAction> = {}
  ): estypes.SearchHit<LogsEndpointAction> {
    return Object.assign(this.toEsSearchHit(this.generate(overrides)), {
      _index: `.ds-${ENDPOINT_ACTIONS_DS}-some_namespace`,
    });
  }

  /** Generates an endpoint action response */
  generateResponse(
    overrides: DeepPartial<LogsEndpointActionResponse> = {}
  ): LogsEndpointActionResponse {
    const timeStamp = overrides['@timestamp'] ? new Date(overrides['@timestamp']) : new Date();

    const startedAtTimes: number[] = [];
    [2, 3, 5, 8, 13, 21].forEach((n) => {
      startedAtTimes.push(
        timeStamp.setMinutes(-this.randomN(n)),
        timeStamp.setSeconds(-this.randomN(n))
      );
    });

    const command = overrides?.EndpointActions?.data?.command ?? this.randomResponseActionCommand();
    let output: ActionResponseOutput<ResponseActionGetFileOutputContent> = overrides
      ?.EndpointActions?.data?.output as ActionResponseOutput<ResponseActionGetFileOutputContent>;

    if (command === 'get-file') {
      if (!output) {
        output = {
          type: 'json',
          content: {
            code: 'ra_get-file_success_done',
            zip_size: 123,
            contents: [
              {
                type: 'file',
                path: '/some/path/bad_file.txt',
                size: 1234,
                file_name: 'bad_file.txt',
                sha256: '9558c5cb39622e9b3653203e772b129d6c634e7dbd7af1b244352fc1d704601f',
              },
            ],
          },
        };
      }
    }

    return merge(
      {
        '@timestamp': timeStamp.toISOString(),
        agent: {
          id: this.seededUUIDv4(),
        },
        EndpointActions: {
          action_id: this.seededUUIDv4(),
          completed_at: timeStamp.toISOString(),
          // randomly before a few hours/minutes/seconds later
          started_at: new Date(startedAtTimes[this.randomN(startedAtTimes.length)]).toISOString(),
          data: {
            command,
            comment: '',
            output,
          },
        },
        error: undefined,
      },
      overrides
    );
  }

  generateResponseEsHit(
    overrides: DeepPartial<LogsEndpointActionResponse> = {}
  ): estypes.SearchHit<LogsEndpointActionResponse> {
    return Object.assign(this.toEsSearchHit(this.generateResponse(overrides)), {
      _index: `.ds-${ENDPOINT_ACTION_RESPONSES_DS}-some_namespace-something`,
    });
  }

  generateActionDetails<
    TOutputType extends object = object,
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes
  >(
    overrides: Partial<ActionDetails<TOutputType, TParameters>> = {}
  ): ActionDetails<TOutputType, TParameters> {
    const details: ActionDetails = merge(
      {
        agents: ['agent-a'],
        command: 'isolate',
        completedAt: '2022-04-30T16:08:47.449Z',
        hosts: { 'agent-a': { name: 'Host-agent-a' } },
        id: '123',
        isCompleted: true,
        isExpired: false,
        wasSuccessful: true,
        errors: undefined,
        startedAt: '2022-04-27T16:08:47.449Z',
        status: 'successful',
        comment: 'thisisacomment',
        createdBy: 'auserid',
        parameters: undefined,
        outputs: {},
        agentState: {
          'agent-a': {
            errors: undefined,
            isCompleted: true,
            completedAt: '2022-04-30T16:08:47.449Z',
            wasSuccessful: true,
          },
        },
      },
      overrides
    );

    if (details.command === 'get-file') {
      if (!details.parameters) {
        (
          details as ActionDetails<
            ResponseActionGetFileOutputContent,
            ResponseActionGetFileParameters
          >
        ).parameters = {
          path: '/some/file.txt',
        };
      }

      if (!details.outputs || Object.keys(details.outputs).length === 0) {
        details.outputs = {
          [details.agents[0]]: {
            type: 'json',
            content: {
              code: 'ra_get-file_success',
              path: '/some/file/txt',
              size: 1234,
              zip_size: 123,
            },
          },
        };
      }
    }

    return details as unknown as ActionDetails<TOutputType, TParameters>;
  }

  randomGetFileFailureCode(): string {
    return this.randomChoice([
      'ra_get-file_error_not-found',
      'ra_get-file_error_is-directory',
      'ra_get-file_error_invalid-input',
      'ra_get-file_error_not-permitted',
      'ra_get-file_error_too-big',
      'ra_get-file_error_disk-quota',
      'ra_get-file_error_processing',
      'ra_get-file_error_upload-api-unreachable',
      'ra_get-file_error_upload-timeout',
      'ra_get-file_error_queue-timeout',
    ]);
  }

  generateActivityLogAction(
    overrides: DeepPartial<EndpointActivityLogAction>
  ): EndpointActivityLogAction {
    return merge(
      {
        type: ActivityLogItemTypes.ACTION,
        item: {
          id: this.seededUUIDv4(),
          data: this.generate(),
        },
      },
      overrides
    );
  }

  generateActivityLogActionResponse(
    overrides: DeepPartial<EndpointActivityLogActionResponse>
  ): EndpointActivityLogActionResponse {
    return merge(
      {
        type: ActivityLogItemTypes.RESPONSE,
        item: {
          id: this.seededUUIDv4(),
          data: this.generateResponse({ ...(overrides?.item?.data ?? {}) }),
        },
      },
      overrides
    );
  }

  generateAgentPendingActionsSummary(
    overrides: Partial<EndpointPendingActions> = {}
  ): EndpointPendingActions {
    return merge(
      {
        agent_id: this.seededUUIDv4(),
        pending_actions: {
          isolate: 2,
          unisolate: 0,
        },
      },
      overrides
    );
  }

  randomFloat(): number {
    return this.random();
  }

  randomN(max: number): number {
    return super.randomN(max);
  }

  randomResponseActionKubeList(
    n?: number,
    resource: 'pod' | 'deployment' = 'pod'
  ): ProcessesEntry[] {
    // const numberOfEntries = n ?? this.randomChoice([20, 30, 40, 50]);
    let output = {};
    // for (let i = 0; i < numberOfEntries; i++) {
    if (resource === 'pod') {
      output = {
        metadata: {
          name: 'memcached-operator2-controller-manager-58f8f47cc7-95tcl',
          generateName: 'memcached-operator2-controller-manager-58f8f47cc7-',
          namespace: 'memcached-operator2-system',
          uid: 'd948cc1f-b304-4386-a37c-d58624550723',
          resourceVersion: '12648043',
          creationTimestamp: '2022-11-07T18:53:28Z',
          labels: { 'control-plane': 'controller-manager', 'pod-template-hash': '58f8f47cc7' },
          annotations: { 'kubectl.kubernetes.io/default-container': 'manager' },
          ownerReferences: [
            {
              apiVersion: 'apps/v1',
              kind: 'ReplicaSet',
              name: 'memcached-operator2-controller-manager-58f8f47cc7',
              uid: 'fe9d7d32-f851-4f03-b5fd-929faad57931',
              controller: true,
              blockOwnerDeletion: true,
            },
          ],
          managedFields: [
            {
              manager: 'kube-controller-manager',
              operation: 'Update',
              apiVersion: 'v1',
              time: '2022-11-07T18:53:28Z',
              fieldsType: 'FieldsV1',
              fieldsV1: {
                'f:metadata': {
                  'f:annotations': { '.': {}, 'f:kubectl.kubernetes.io/default-container': {} },
                  'f:generateName': {},
                  'f:labels': { '.': {}, 'f:control-plane': {}, 'f:pod-template-hash': {} },
                  'f:ownerReferences': {
                    '.': {},
                    'k:{"uid":"fe9d7d32-f851-4f03-b5fd-929faad57931"}': {},
                  },
                },
                'f:spec': {
                  'f:affinity': {
                    '.': {},
                    'f:nodeAffinity': {
                      '.': {},
                      'f:requiredDuringSchedulingIgnoredDuringExecution': {},
                    },
                  },
                  'f:containers': {
                    'k:{"name":"kube-rbac-proxy"}': {
                      '.': {},
                      'f:args': {},
                      'f:image': {},
                      'f:imagePullPolicy': {},
                      'f:name': {},
                      'f:ports': {
                        '.': {},
                        'k:{"containerPort":8443,"protocol":"TCP"}': {
                          '.': {},
                          'f:containerPort': {},
                          'f:name': {},
                          'f:protocol': {},
                        },
                      },
                      'f:resources': {
                        '.': {},
                        'f:limits': { '.': {}, 'f:cpu': {}, 'f:memory': {} },
                        'f:requests': { '.': {}, 'f:cpu': {}, 'f:memory': {} },
                      },
                      'f:securityContext': {
                        '.': {},
                        'f:allowPrivilegeEscalation': {},
                        'f:capabilities': { '.': {}, 'f:drop': {} },
                      },
                      'f:terminationMessagePath': {},
                      'f:terminationMessagePolicy': {},
                    },
                    'k:{"name":"manager"}': {
                      '.': {},
                      'f:args': {},
                      'f:command': {},
                      'f:image': {},
                      'f:imagePullPolicy': {},
                      'f:livenessProbe': {
                        '.': {},
                        'f:failureThreshold': {},
                        'f:httpGet': { '.': {}, 'f:path': {}, 'f:port': {}, 'f:scheme': {} },
                        'f:initialDelaySeconds': {},
                        'f:periodSeconds': {},
                        'f:successThreshold': {},
                        'f:timeoutSeconds': {},
                      },
                      'f:name': {},
                      'f:readinessProbe': {
                        '.': {},
                        'f:failureThreshold': {},
                        'f:httpGet': { '.': {}, 'f:path': {}, 'f:port': {}, 'f:scheme': {} },
                        'f:initialDelaySeconds': {},
                        'f:periodSeconds': {},
                        'f:successThreshold': {},
                        'f:timeoutSeconds': {},
                      },
                      'f:resources': {
                        '.': {},
                        'f:limits': { '.': {}, 'f:cpu': {}, 'f:memory': {} },
                        'f:requests': { '.': {}, 'f:cpu': {}, 'f:memory': {} },
                      },
                      'f:securityContext': {
                        '.': {},
                        'f:allowPrivilegeEscalation': {},
                        'f:capabilities': { '.': {}, 'f:drop': {} },
                      },
                      'f:terminationMessagePath': {},
                      'f:terminationMessagePolicy': {},
                    },
                  },
                  'f:dnsPolicy': {},
                  'f:enableServiceLinks': {},
                  'f:restartPolicy': {},
                  'f:schedulerName': {},
                  'f:securityContext': { '.': {}, 'f:runAsNonRoot': {} },
                  'f:serviceAccount': {},
                  'f:serviceAccountName': {},
                  'f:terminationGracePeriodSeconds': {},
                },
              },
            },
            {
              manager: 'kubelet',
              operation: 'Update',
              apiVersion: 'v1',
              time: '2022-11-23T12:56:02Z',
              fieldsType: 'FieldsV1',
              fieldsV1: {
                'f:status': {
                  'f:conditions': {
                    'k:{"type":"ContainersReady"}': {
                      '.': {},
                      'f:lastProbeTime': {},
                      'f:lastTransitionTime': {},
                      'f:status': {},
                      'f:type': {},
                    },
                    'k:{"type":"Initialized"}': {
                      '.': {},
                      'f:lastProbeTime': {},
                      'f:lastTransitionTime': {},
                      'f:status': {},
                      'f:type': {},
                    },
                    'k:{"type":"Ready"}': {
                      '.': {},
                      'f:lastProbeTime': {},
                      'f:lastTransitionTime': {},
                      'f:status': {},
                      'f:type': {},
                    },
                  },
                  'f:containerStatuses': {},
                  'f:hostIP': {},
                  'f:phase': {},
                  'f:podIP': {},
                  'f:podIPs': { '.': {}, 'k:{"ip":"10.116.2.9"}': { '.': {}, 'f:ip': {} } },
                  'f:startTime': {},
                },
              },
              subresource: 'status',
            },
          ],
        },
        spec: {
          volumes: [
            {
              name: 'kube-api-access-qmd55',
              projected: {
                sources: [
                  { serviceAccountToken: { expirationSeconds: 3607, path: 'token' } },
                  {
                    configMap: {
                      name: 'kube-root-ca.crt',
                      items: [{ key: 'ca.crt', path: 'ca.crt' }],
                    },
                  },
                  {
                    downwardAPI: {
                      items: [
                        {
                          path: 'namespace',
                          fieldRef: { apiVersion: 'v1', fieldPath: 'metadata.namespace' },
                        },
                      ],
                    },
                  },
                ],
                defaultMode: 420,
              },
            },
          ],
          containers: [
            {
              name: 'kube-rbac-proxy',
              image: 'gcr.io/kubebuilder/kube-rbac-proxy:v0.13.0',
              args: [
                '--secure-listen-address=0.0.0.0:8443',
                '--upstream=http://127.0.0.1:8080/',
                '--logtostderr=true',
                '--v=0',
              ],
              ports: [{ name: 'https', containerPort: 8443, protocol: 'TCP' }],
              resources: {
                limits: { cpu: '500m', memory: '128Mi' },
                requests: { cpu: '5m', memory: '64Mi' },
              },
              volumeMounts: [
                {
                  name: 'kube-api-access-qmd55',
                  readOnly: true,
                  mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
                },
              ],
              terminationMessagePath: '/dev/termination-log',
              terminationMessagePolicy: 'File',
              imagePullPolicy: 'IfNotPresent',
              securityContext: {
                capabilities: { drop: ['ALL'] },
                allowPrivilegeEscalation: false,
              },
            },
            {
              name: 'manager',
              image:
                'gcr.io/elastic-security-dev/patrickmamaid/memcache/memcached-operator2:v0.0.7',
              command: ['/manager'],
              args: [
                '--health-probe-bind-address=:8081',
                '--metrics-bind-address=127.0.0.1:8080',
                '--leader-elect',
              ],
              resources: {
                limits: { cpu: '500m', memory: '128Mi' },
                requests: { cpu: '10m', memory: '64Mi' },
              },
              volumeMounts: [
                {
                  name: 'kube-api-access-qmd55',
                  readOnly: true,
                  mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
                },
              ],
              livenessProbe: {
                httpGet: { path: '/healthz', port: 8081, scheme: 'HTTP' },
                initialDelaySeconds: 15,
                timeoutSeconds: 1,
                periodSeconds: 20,
                successThreshold: 1,
                failureThreshold: 3,
              },
              readinessProbe: {
                httpGet: { path: '/readyz', port: 8081, scheme: 'HTTP' },
                initialDelaySeconds: 5,
                timeoutSeconds: 1,
                periodSeconds: 10,
                successThreshold: 1,
                failureThreshold: 3,
              },
              terminationMessagePath: '/dev/termination-log',
              terminationMessagePolicy: 'File',
              imagePullPolicy: 'IfNotPresent',
              securityContext: {
                capabilities: { drop: ['ALL'] },
                allowPrivilegeEscalation: true,
              },
            },
          ],
          restartPolicy: 'Always',
          terminationGracePeriodSeconds: 10,
          dnsPolicy: 'ClusterFirst',
          serviceAccountName: 'memcached-operator2-controller-manager',
          serviceAccount: 'memcached-operator2-controller-manager',
          nodeName: 'gke-patrick-test-4-default-pool-c25232b8-5g1d',
          securityContext: { runAsNonRoot: false },
          affinity: {
            nodeAffinity: {
              requiredDuringSchedulingIgnoredDuringExecution: {
                nodeSelectorTerms: [
                  {
                    matchExpressions: [
                      {
                        key: 'kubernetes.io/arch',
                        operator: 'In',
                        values: ['amd64', 'arm64', 'ppc64le', 's390x'],
                      },
                      { key: 'kubernetes.io/os', operator: 'In', values: ['linux'] },
                    ],
                  },
                ],
              },
            },
          },
          schedulerName: 'default-scheduler',
          tolerations: [
            {
              key: 'node.kubernetes.io/not-ready',
              operator: 'Exists',
              effect: 'NoExecute',
              tolerationSeconds: 300,
            },
            {
              key: 'node.kubernetes.io/unreachable',
              operator: 'Exists',
              effect: 'NoExecute',
              tolerationSeconds: 300,
            },
          ],
          priority: 0,
          enableServiceLinks: true,
          preemptionPolicy: 'PreemptLowerPriority',
        },
        status: {
          phase: 'Running',
          conditions: [
            {
              type: 'Initialized',
              status: 'True',
              lastProbeTime: null,
              lastTransitionTime: '2022-11-07T18:53:29Z',
            },
            {
              type: 'Ready',
              status: 'True',
              lastProbeTime: null,
              lastTransitionTime: '2022-11-23T12:56:01Z',
            },
            {
              type: 'ContainersReady',
              status: 'True',
              lastProbeTime: null,
              lastTransitionTime: '2022-11-23T12:56:01Z',
            },
            {
              type: 'PodScheduled',
              status: 'True',
              lastProbeTime: null,
              lastTransitionTime: '2022-11-07T18:53:29Z',
            },
          ],
          hostIP: '10.128.0.179',
          podIP: '10.116.2.9',
          podIPs: [{ ip: '10.116.2.9' }],
          startTime: '2022-11-07T18:53:29Z',
          containerStatuses: [
            {
              name: 'kube-rbac-proxy',
              state: { running: { startedAt: '2022-11-07T18:53:31Z' } },
              lastState: {},
              ready: true,
              restartCount: 0,
              image: 'gcr.io/kubebuilder/kube-rbac-proxy:v0.13.0',
              imageID:
                'gcr.io/kubebuilder/kube-rbac-proxy@sha256:d99a8d144816b951a67648c12c0b988936ccd25cf3754f3cd85ab8c01592248f',
              containerID:
                'containerd://666fbe94ba86ba37c4c74d20567b29e2d0d6c9aadd059ed21ed89fa3c4334ab0',
              started: true,
            },
            {
              name: 'manager',
              state: { running: { startedAt: '2022-11-23T12:55:33Z' } },
              lastState: {
                terminated: {
                  exitCode: 1,
                  reason: 'Error',
                  startedAt: '2022-11-17T10:20:33Z',
                  finishedAt: '2022-11-23T12:55:32Z',
                  containerID:
                    'containerd://10f6e25777889475a8204d9283b82de9ffecf5492ec12b66cc1ee7433248846d',
                },
              },
              ready: true,
              restartCount: 8,
              image:
                'gcr.io/elastic-security-dev/patrickmamaid/memcache/memcached-operator2:v0.0.7',
              imageID:
                'gcr.io/elastic-security-dev/patrickmamaid/memcache/memcached-operator2@sha256:dd577bca818e0ed2761e01423b50b66ba62a84ff4371cb4841a3dea56ca6897d',
              containerID:
                'containerd://dd5d320eedf177690b7360a48d6f7d90fc40718ee6ce115f0546a7db8d19c16e',
              started: true,
            },
          ],
          qosClass: 'Burstable',
        },
      };
    } else if (resource === 'deployment') {
      output = {
        metadata: {
          resourceVersion: '16391970',
        },
        items: [
          {
            metadata: {
              name: 'memcached-sample',
              namespace: 'default',
              uid: '3f3505c7-1896-46aa-ab10-b85df0aa9f0f',
              resourceVersion: '1800983',
              generation: 2,
              creationTimestamp: '2022-11-07T18:53:48Z',
              annotations: {
                'deployment.kubernetes.io/revision': '1',
              },
              ownerReferences: [
                {
                  apiVersion: 'cache.example.com/v1alpha1',
                  kind: 'Memcached',
                  name: 'memcached-sample',
                  uid: '251a49ec-271a-4ff6-93de-4c62544ac3b0',
                  controller: true,
                  blockOwnerDeletion: true,
                },
              ],
              managedFields: [
                {
                  manager: 'manager',
                  operation: 'Update',
                  apiVersion: 'apps/v1',
                  time: '2022-11-07T18:53:48Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:ownerReferences': {
                        '.': {},
                        'k:{"uid":"251a49ec-271a-4ff6-93de-4c62544ac3b0"}': {},
                      },
                    },
                    'f:spec': {
                      'f:progressDeadlineSeconds': {},
                      'f:replicas': {},
                      'f:revisionHistoryLimit': {},
                      'f:selector': {},
                      'f:strategy': {
                        'f:rollingUpdate': {
                          '.': {},
                          'f:maxSurge': {},
                          'f:maxUnavailable': {},
                        },
                        'f:type': {},
                      },
                      'f:template': {
                        'f:metadata': {
                          'f:labels': {
                            '.': {},
                            'f:app.kubernetes.io/created-by': {},
                            'f:app.kubernetes.io/instance': {},
                            'f:app.kubernetes.io/name': {},
                            'f:app.kubernetes.io/part-of': {},
                            'f:app.kubernetes.io/version': {},
                          },
                        },
                        'f:spec': {
                          'f:containers': {
                            'k:{"name":"memcached"}': {
                              '.': {},
                              'f:command': {},
                              'f:image': {},
                              'f:imagePullPolicy': {},
                              'f:name': {},
                              'f:ports': {
                                '.': {},
                                'k:{"containerPort":11211,"protocol":"TCP"}': {
                                  '.': {},
                                  'f:containerPort': {},
                                  'f:name': {},
                                  'f:protocol': {},
                                },
                              },
                              'f:resources': {},
                              'f:securityContext': {
                                '.': {},
                                'f:allowPrivilegeEscalation': {},
                                'f:capabilities': {
                                  '.': {},
                                  'f:drop': {},
                                },
                                'f:runAsNonRoot': {},
                                'f:runAsUser': {},
                              },
                              'f:terminationMessagePath': {},
                              'f:terminationMessagePolicy': {},
                            },
                          },
                          'f:dnsPolicy': {},
                          'f:restartPolicy': {},
                          'f:schedulerName': {},
                          'f:securityContext': {
                            '.': {},
                            'f:runAsNonRoot': {},
                            'f:seccompProfile': {
                              '.': {},
                              'f:type': {},
                            },
                          },
                          'f:terminationGracePeriodSeconds': {},
                        },
                      },
                    },
                  },
                },
                {
                  manager: 'kube-controller-manager',
                  operation: 'Update',
                  apiVersion: 'apps/v1',
                  time: '2022-11-07T18:54:19Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:annotations': {
                        '.': {},
                        'f:deployment.kubernetes.io/revision': {},
                      },
                    },
                    'f:status': {
                      'f:availableReplicas': {},
                      'f:conditions': {
                        '.': {},
                        'k:{"type":"Available"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                        'k:{"type":"Progressing"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                      },
                      'f:observedGeneration': {},
                      'f:readyReplicas': {},
                      'f:replicas': {},
                      'f:updatedReplicas': {},
                    },
                  },
                  subresource: 'status',
                },
              ],
            },
            spec: {
              replicas: 4,
              selector: {
                matchLabels: {
                  'app.kubernetes.io/created-by': 'controller-manager',
                  'app.kubernetes.io/instance': 'memcached-sample',
                  'app.kubernetes.io/name': 'Memcached',
                  'app.kubernetes.io/part-of': 'memcached-operator',
                  'app.kubernetes.io/version': '1.4.36-alpine',
                },
              },
              template: {
                metadata: {
                  creationTimestamp: null,
                  labels: {
                    'app.kubernetes.io/created-by': 'controller-manager',
                    'app.kubernetes.io/instance': 'memcached-sample',
                    'app.kubernetes.io/name': 'Memcached',
                    'app.kubernetes.io/part-of': 'memcached-operator',
                    'app.kubernetes.io/version': '1.4.36-alpine',
                  },
                },
                spec: {
                  containers: [
                    {
                      name: 'memcached',
                      image: 'memcached:1.4.36-alpine',
                      command: ['memcached', '-m=64', '-o', 'modern', '-v'],
                      ports: [
                        {
                          name: 'memcached',
                          containerPort: 11211,
                          protocol: 'TCP',
                        },
                      ],
                      resources: {},
                      terminationMessagePath: '/dev/termination-log',
                      terminationMessagePolicy: 'File',
                      imagePullPolicy: 'IfNotPresent',
                      securityContext: {
                        capabilities: {
                          drop: ['ALL'],
                        },
                        runAsUser: 1001,
                        runAsNonRoot: true,
                        allowPrivilegeEscalation: false,
                      },
                    },
                  ],
                  restartPolicy: 'Always',
                  terminationGracePeriodSeconds: 30,
                  dnsPolicy: 'ClusterFirst',
                  securityContext: {
                    runAsNonRoot: true,
                    seccompProfile: {
                      type: 'RuntimeDefault',
                    },
                  },
                  schedulerName: 'default-scheduler',
                },
              },
              strategy: {
                type: 'RollingUpdate',
                rollingUpdate: {
                  maxUnavailable: '25%',
                  maxSurge: '25%',
                },
              },
              revisionHistoryLimit: 10,
              progressDeadlineSeconds: 600,
            },
            status: {
              observedGeneration: 2,
              replicas: 4,
              updatedReplicas: 4,
              readyReplicas: 4,
              availableReplicas: 4,
              conditions: [
                {
                  type: 'Progressing',
                  status: 'True',
                  lastUpdateTime: '2022-11-07T18:53:50Z',
                  lastTransitionTime: '2022-11-07T18:53:48Z',
                  reason: 'NewReplicaSetAvailable',
                  message: 'ReplicaSet "memcached-sample-55d9f579bb" has successfully progressed.',
                },
                {
                  type: 'Available',
                  status: 'True',
                  lastUpdateTime: '2022-11-07T18:54:18Z',
                  lastTransitionTime: '2022-11-07T18:54:18Z',
                  reason: 'MinimumReplicasAvailable',
                  message: 'Deployment has minimum availability.',
                },
              ],
            },
          },
          {
            metadata: {
              name: 'event-exporter-gke',
              namespace: 'kube-system',
              uid: '78be4281-6023-4ca7-82bd-62c201fdcd5e',
              resourceVersion: '3024458',
              generation: 1,
              creationTimestamp: '2022-11-05T00:03:33Z',
              labels: {
                'addonmanager.kubernetes.io/mode': 'Reconcile',
                'k8s-app': 'event-exporter',
                'kubernetes.io/cluster-service': 'true',
                version: 'v0.3.10',
              },
              annotations: {
                'deployment.kubernetes.io/revision': '1',
              },
              managedFields: [
                {
                  manager: 'kube-addon-manager',
                  operation: 'Apply',
                  apiVersion: 'apps/v1',
                  time: '2022-11-09T13:42:34Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:labels': {
                        'f:addonmanager.kubernetes.io/mode': {},
                        'f:k8s-app': {},
                        'f:kubernetes.io/cluster-service': {},
                        'f:version': {},
                      },
                    },
                    'f:spec': {
                      'f:replicas': {},
                      'f:selector': {},
                      'f:template': {
                        'f:metadata': {
                          'f:annotations': {
                            'f:components.gke.io/component-name': {},
                            'f:components.gke.io/component-version': {},
                          },
                          'f:labels': {
                            'f:k8s-app': {},
                            'f:version': {},
                          },
                        },
                        'f:spec': {
                          'f:containers': {
                            'k:{"name":"event-exporter"}': {
                              '.': {},
                              'f:command': {},
                              'f:image': {},
                              'f:name': {},
                              'f:securityContext': {
                                'f:allowPrivilegeEscalation': {},
                                'f:capabilities': {
                                  'f:drop': {},
                                },
                              },
                            },
                            'k:{"name":"prometheus-to-sd-exporter"}': {
                              '.': {},
                              'f:command': {},
                              'f:env': {
                                'k:{"name":"NODE_NAME"}': {
                                  '.': {},
                                  'f:name': {},
                                  'f:valueFrom': {
                                    'f:fieldRef': {},
                                  },
                                },
                                'k:{"name":"POD_NAME"}': {
                                  '.': {},
                                  'f:name': {},
                                  'f:valueFrom': {
                                    'f:fieldRef': {},
                                  },
                                },
                                'k:{"name":"POD_NAMESPACE"}': {
                                  '.': {},
                                  'f:name': {},
                                  'f:valueFrom': {
                                    'f:fieldRef': {},
                                  },
                                },
                              },
                              'f:image': {},
                              'f:name': {},
                              'f:securityContext': {
                                'f:allowPrivilegeEscalation': {},
                                'f:capabilities': {
                                  'f:drop': {},
                                },
                              },
                            },
                          },
                          'f:nodeSelector': {},
                          'f:securityContext': {
                            'f:runAsGroup': {},
                            'f:runAsUser': {},
                          },
                          'f:serviceAccountName': {},
                          'f:terminationGracePeriodSeconds': {},
                          'f:tolerations': {},
                          'f:volumes': {
                            'k:{"name":"ssl-certs"}': {
                              '.': {},
                              'f:hostPath': {
                                'f:path': {},
                                'f:type': {},
                              },
                              'f:name': {},
                            },
                          },
                        },
                      },
                    },
                  },
                },
                {
                  manager: 'kube-controller-manager',
                  operation: 'Update',
                  apiVersion: 'apps/v1',
                  time: '2022-11-05T00:04:59Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:annotations': {
                        '.': {},
                        'f:deployment.kubernetes.io/revision': {},
                      },
                    },
                    'f:status': {
                      'f:availableReplicas': {},
                      'f:conditions': {
                        '.': {},
                        'k:{"type":"Available"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                        'k:{"type":"Progressing"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                      },
                      'f:observedGeneration': {},
                      'f:readyReplicas': {},
                      'f:replicas': {},
                      'f:updatedReplicas': {},
                    },
                  },
                  subresource: 'status',
                },
              ],
            },
            spec: {
              replicas: 1,
              selector: {
                matchLabels: {
                  'k8s-app': 'event-exporter',
                },
              },
              template: {
                metadata: {
                  creationTimestamp: null,
                  labels: {
                    'k8s-app': 'event-exporter',
                    version: 'v0.3.10',
                  },
                  annotations: {
                    'components.gke.io/component-name': 'event-exporter',
                    'components.gke.io/component-version': '1.1.6',
                  },
                },
                spec: {
                  volumes: [
                    {
                      name: 'ssl-certs',
                      hostPath: {
                        path: '/etc/ssl/certs',
                        type: 'Directory',
                      },
                    },
                  ],
                  containers: [
                    {
                      name: 'event-exporter',
                      image: 'gke.gcr.io/event-exporter:v0.3.10-gke.0',
                      command: [
                        '/event-exporter',
                        '-sink-opts=-stackdriver-resource-model=new -endpoint=https://logging.googleapis.com',
                        '-prometheus-endpoint=:8080',
                      ],
                      resources: {},
                      terminationMessagePath: '/dev/termination-log',
                      terminationMessagePolicy: 'File',
                      imagePullPolicy: 'IfNotPresent',
                      securityContext: {
                        capabilities: {
                          drop: ['all'],
                        },
                        allowPrivilegeEscalation: false,
                      },
                    },
                    {
                      name: 'prometheus-to-sd-exporter',
                      image: 'gke.gcr.io/prometheus-to-sd:v0.11.3-gke.0',
                      command: [
                        '/monitor',
                        '--api-override=https://monitoring.googleapis.com/',
                        '--source=event_exporter:http://localhost:8080?metricsPrefix=container.googleapis.com/internal/addons\u0026whitelisted=stackdriver_sink_received_entry_count,stackdriver_sink_request_count,stackdriver_sink_successfully_sent_entry_count',
                        '--source=event_exporter:http://localhost:8080?metricsPrefix=kubernetes.io/internal/addons\u0026customResourceType=k8s_container\u0026customLabels[project_id]\u0026customLabels[location]\u0026customLabels[cluster_name]\u0026customLabels[namespace_name]=kube-system\u0026customLabels[pod_name]=event-exporter-$NODE_NAME\u0026customLabels[container_name]=event-exporter\u0026whitelisted=stackdriver_sink_records_latency_seconds',
                        '--pod-id=$(POD_NAME)',
                        '--namespace-id=$(POD_NAMESPACE)',
                        '--node-name=$(NODE_NAME)',
                      ],
                      env: [
                        {
                          name: 'POD_NAME',
                          valueFrom: {
                            fieldRef: {
                              apiVersion: 'v1',
                              fieldPath: 'metadata.name',
                            },
                          },
                        },
                        {
                          name: 'POD_NAMESPACE',
                          valueFrom: {
                            fieldRef: {
                              apiVersion: 'v1',
                              fieldPath: 'metadata.namespace',
                            },
                          },
                        },
                        {
                          name: 'NODE_NAME',
                          valueFrom: {
                            fieldRef: {
                              apiVersion: 'v1',
                              fieldPath: 'spec.nodeName',
                            },
                          },
                        },
                      ],
                      resources: {},
                      terminationMessagePath: '/dev/termination-log',
                      terminationMessagePolicy: 'File',
                      imagePullPolicy: 'IfNotPresent',
                      securityContext: {
                        capabilities: {
                          drop: ['all'],
                        },
                        allowPrivilegeEscalation: false,
                      },
                    },
                  ],
                  restartPolicy: 'Always',
                  terminationGracePeriodSeconds: 120,
                  dnsPolicy: 'ClusterFirst',
                  nodeSelector: {
                    'kubernetes.io/os': 'linux',
                  },
                  serviceAccountName: 'event-exporter-sa',
                  serviceAccount: 'event-exporter-sa',
                  securityContext: {
                    runAsUser: 1000,
                    runAsGroup: 1000,
                  },
                  schedulerName: 'default-scheduler',
                  tolerations: [
                    {
                      key: 'kubernetes.io/arch',
                      operator: 'Equal',
                      value: 'arm64',
                      effect: 'NoSchedule',
                    },
                    {
                      key: 'components.gke.io/gke-managed-components',
                      operator: 'Exists',
                    },
                  ],
                },
              },
              strategy: {
                type: 'RollingUpdate',
                rollingUpdate: {
                  maxUnavailable: '25%',
                  maxSurge: '25%',
                },
              },
              revisionHistoryLimit: 10,
              progressDeadlineSeconds: 600,
            },
            status: {
              observedGeneration: 1,
              replicas: 1,
              updatedReplicas: 1,
              readyReplicas: 1,
              availableReplicas: 1,
              conditions: [
                {
                  type: 'Available',
                  status: 'True',
                  lastUpdateTime: '2022-11-05T00:04:59Z',
                  lastTransitionTime: '2022-11-05T00:04:59Z',
                  reason: 'MinimumReplicasAvailable',
                  message: 'Deployment has minimum availability.',
                },
                {
                  type: 'Progressing',
                  status: 'True',
                  lastUpdateTime: '2022-11-05T00:04:59Z',
                  lastTransitionTime: '2022-11-05T00:03:33Z',
                  reason: 'NewReplicaSetAvailable',
                  message:
                    'ReplicaSet "event-exporter-gke-5dc976447f" has successfully progressed.',
                },
              ],
            },
          },
          {
            metadata: {
              name: 'konnectivity-agent',
              namespace: 'kube-system',
              uid: 'aeb51436-be4b-48a2-ae8a-08d2ea66fa08',
              resourceVersion: '3024506',
              generation: 2,
              creationTimestamp: '2022-11-05T00:03:40Z',
              labels: {
                'addonmanager.kubernetes.io/mode': 'Reconcile',
                'k8s-app': 'konnectivity-agent',
              },
              annotations: {
                'components.gke.io/layer': 'addon',
                'credential-normal-mode': 'true',
                'deployment.kubernetes.io/revision': '1',
              },
              managedFields: [
                {
                  manager: 'kube-addon-manager',
                  operation: 'Apply',
                  apiVersion: 'apps/v1',
                  time: '2022-11-09T13:42:40Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:annotations': {
                        'f:components.gke.io/layer': {},
                        'f:credential-normal-mode': {},
                      },
                      'f:labels': {
                        'f:addonmanager.kubernetes.io/mode': {},
                        'f:k8s-app': {},
                      },
                    },
                    'f:spec': {
                      'f:selector': {},
                      'f:strategy': {
                        'f:type': {},
                      },
                      'f:template': {
                        'f:metadata': {
                          'f:annotations': {
                            'f:cluster-autoscaler.kubernetes.io/safe-to-evict': {},
                            'f:components.gke.io/component-name': {},
                            'f:components.gke.io/component-version': {},
                          },
                          'f:labels': {
                            'f:k8s-app': {},
                          },
                        },
                        'f:spec': {
                          'f:containers': {
                            'k:{"name":"konnectivity-agent"}': {
                              '.': {},
                              'f:args': {},
                              'f:command': {},
                              'f:env': {
                                'k:{"name":"POD_NAME"}': {
                                  '.': {},
                                  'f:name': {},
                                  'f:valueFrom': {
                                    'f:fieldRef': {},
                                  },
                                },
                                'k:{"name":"POD_NAMESPACE"}': {
                                  '.': {},
                                  'f:name': {},
                                  'f:valueFrom': {
                                    'f:fieldRef': {},
                                  },
                                },
                              },
                              'f:image': {},
                              'f:livenessProbe': {
                                'f:httpGet': {
                                  'f:path': {},
                                  'f:port': {},
                                },
                                'f:initialDelaySeconds': {},
                                'f:timeoutSeconds': {},
                              },
                              'f:name': {},
                              'f:ports': {
                                'k:{"containerPort":8093,"protocol":"TCP"}': {
                                  '.': {},
                                  'f:containerPort': {},
                                  'f:name': {},
                                  'f:protocol': {},
                                },
                              },
                              'f:resources': {
                                'f:limits': {
                                  'f:memory': {},
                                },
                                'f:requests': {
                                  'f:cpu': {},
                                  'f:memory': {},
                                },
                              },
                              'f:securityContext': {
                                'f:allowPrivilegeEscalation': {},
                                'f:capabilities': {
                                  'f:drop': {},
                                },
                              },
                              'f:volumeMounts': {
                                'k:{"mountPath":"/var/run/secrets/tokens"}': {
                                  '.': {},
                                  'f:mountPath': {},
                                  'f:name': {},
                                },
                              },
                            },
                          },
                          'f:nodeSelector': {},
                          'f:priorityClassName': {},
                          'f:securityContext': {
                            'f:fsGroup': {},
                            'f:runAsGroup': {},
                            'f:runAsUser': {},
                            'f:seccompProfile': {
                              'f:type': {},
                            },
                          },
                          'f:serviceAccountName': {},
                          'f:tolerations': {},
                          'f:topologySpreadConstraints': {
                            'k:{"topologyKey":"kubernetes.io/hostname","whenUnsatisfiable":"ScheduleAnyway"}':
                              {
                                '.': {},
                                'f:labelSelector': {},
                                'f:maxSkew': {},
                                'f:topologyKey': {},
                                'f:whenUnsatisfiable': {},
                              },
                            'k:{"topologyKey":"topology.kubernetes.io/zone","whenUnsatisfiable":"ScheduleAnyway"}':
                              {
                                '.': {},
                                'f:labelSelector': {},
                                'f:maxSkew': {},
                                'f:topologyKey': {},
                                'f:whenUnsatisfiable': {},
                              },
                          },
                          'f:volumes': {
                            'k:{"name":"konnectivity-agent-token"}': {
                              '.': {},
                              'f:name': {},
                              'f:projected': {
                                'f:sources': {},
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                {
                  manager: 'kube-controller-manager',
                  operation: 'Update',
                  apiVersion: 'apps/v1',
                  time: '2022-11-05T00:04:53Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:annotations': {
                        'f:deployment.kubernetes.io/revision': {},
                      },
                    },
                    'f:status': {
                      'f:availableReplicas': {},
                      'f:conditions': {
                        '.': {},
                        'k:{"type":"Available"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                        'k:{"type":"Progressing"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                      },
                      'f:observedGeneration': {},
                      'f:readyReplicas': {},
                      'f:replicas': {},
                      'f:updatedReplicas': {},
                    },
                  },
                  subresource: 'status',
                },
              ],
            },
            spec: {
              replicas: 3,
              selector: {
                matchLabels: {
                  'k8s-app': 'konnectivity-agent',
                },
              },
              template: {
                metadata: {
                  creationTimestamp: null,
                  labels: {
                    'k8s-app': 'konnectivity-agent',
                  },
                  annotations: {
                    'cluster-autoscaler.kubernetes.io/safe-to-evict': 'true',
                    'components.gke.io/component-name': 'konnectivitynetworkproxy-combined',
                    'components.gke.io/component-version': '1.5.9',
                  },
                },
                spec: {
                  volumes: [
                    {
                      name: 'konnectivity-agent-token',
                      projected: {
                        sources: [
                          {
                            serviceAccountToken: {
                              audience: 'system:konnectivity-server',
                              expirationSeconds: 3600,
                              path: 'konnectivity-agent-token',
                            },
                          },
                        ],
                        defaultMode: 420,
                      },
                    },
                  ],
                  containers: [
                    {
                      name: 'konnectivity-agent',
                      image: 'gke.gcr.io/proxy-agent:v0.0.31-gke.0',
                      command: ['/proxy-agent'],
                      args: [
                        '--logtostderr=true',
                        '--ca-cert=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt',
                        '--proxy-server-host=10.128.0.155',
                        '--proxy-server-port=8132',
                        '--health-server-port=8093',
                        '--admin-server-port=8094',
                        '--sync-interval=5s',
                        '--sync-interval-cap=30s',
                        '--sync-forever=true',
                        '--probe-interval=5s',
                        '--keepalive-time=60s',
                        '--service-account-token-path=/var/run/secrets/tokens/konnectivity-agent-token',
                        '--v=3',
                      ],
                      ports: [
                        {
                          name: 'metrics',
                          containerPort: 8093,
                          protocol: 'TCP',
                        },
                      ],
                      env: [
                        {
                          name: 'POD_NAME',
                          valueFrom: {
                            fieldRef: {
                              apiVersion: 'v1',
                              fieldPath: 'metadata.name',
                            },
                          },
                        },
                        {
                          name: 'POD_NAMESPACE',
                          valueFrom: {
                            fieldRef: {
                              apiVersion: 'v1',
                              fieldPath: 'metadata.namespace',
                            },
                          },
                        },
                      ],
                      resources: {
                        limits: {
                          memory: '125Mi',
                        },
                        requests: {
                          cpu: '10m',
                          memory: '30Mi',
                        },
                      },
                      volumeMounts: [
                        {
                          name: 'konnectivity-agent-token',
                          mountPath: '/var/run/secrets/tokens',
                        },
                      ],
                      livenessProbe: {
                        httpGet: {
                          path: '/healthz',
                          port: 8093,
                          scheme: 'HTTP',
                        },
                        initialDelaySeconds: 15,
                        timeoutSeconds: 15,
                        periodSeconds: 10,
                        successThreshold: 1,
                        failureThreshold: 3,
                      },
                      terminationMessagePath: '/dev/termination-log',
                      terminationMessagePolicy: 'File',
                      imagePullPolicy: 'IfNotPresent',
                      securityContext: {
                        capabilities: {
                          drop: ['all'],
                        },
                        allowPrivilegeEscalation: false,
                      },
                    },
                  ],
                  restartPolicy: 'Always',
                  terminationGracePeriodSeconds: 30,
                  dnsPolicy: 'ClusterFirst',
                  nodeSelector: {
                    'beta.kubernetes.io/os': 'linux',
                  },
                  serviceAccountName: 'konnectivity-agent',
                  serviceAccount: 'konnectivity-agent',
                  securityContext: {
                    runAsUser: 1000,
                    runAsGroup: 1000,
                    fsGroup: 1000,
                    seccompProfile: {
                      type: 'RuntimeDefault',
                    },
                  },
                  schedulerName: 'default-scheduler',
                  tolerations: [
                    {
                      key: 'CriticalAddonsOnly',
                      operator: 'Exists',
                    },
                    {
                      key: 'sandbox.gke.io/runtime',
                      operator: 'Equal',
                      value: 'gvisor',
                      effect: 'NoSchedule',
                    },
                    {
                      key: 'kubernetes.io/arch',
                      operator: 'Equal',
                      value: 'arm64',
                      effect: 'NoSchedule',
                    },
                    {
                      key: 'components.gke.io/gke-managed-components',
                      operator: 'Exists',
                    },
                  ],
                  priorityClassName: 'system-cluster-critical',
                  topologySpreadConstraints: [
                    {
                      maxSkew: 1,
                      topologyKey: 'topology.kubernetes.io/zone',
                      whenUnsatisfiable: 'ScheduleAnyway',
                      labelSelector: {
                        matchLabels: {
                          'k8s-app': 'konnectivity-agent',
                        },
                      },
                    },
                    {
                      maxSkew: 1,
                      topologyKey: 'kubernetes.io/hostname',
                      whenUnsatisfiable: 'ScheduleAnyway',
                      labelSelector: {
                        matchLabels: {
                          'k8s-app': 'konnectivity-agent',
                        },
                      },
                    },
                  ],
                },
              },
              strategy: {
                type: 'RollingUpdate',
                rollingUpdate: {
                  maxUnavailable: '25%',
                  maxSurge: '25%',
                },
              },
              revisionHistoryLimit: 10,
              progressDeadlineSeconds: 600,
            },
            status: {
              observedGeneration: 2,
              replicas: 3,
              updatedReplicas: 3,
              readyReplicas: 3,
              availableReplicas: 3,
              conditions: [
                {
                  type: 'Available',
                  status: 'True',
                  lastUpdateTime: '2022-11-05T00:04:53Z',
                  lastTransitionTime: '2022-11-05T00:04:53Z',
                  reason: 'MinimumReplicasAvailable',
                  message: 'Deployment has minimum availability.',
                },
                {
                  type: 'Progressing',
                  status: 'True',
                  lastUpdateTime: '2022-11-05T00:04:53Z',
                  lastTransitionTime: '2022-11-05T00:03:40Z',
                  reason: 'NewReplicaSetAvailable',
                  message:
                    'ReplicaSet "konnectivity-agent-5667fd9f9d" has successfully progressed.',
                },
              ],
            },
          },
          {
            metadata: {
              name: 'konnectivity-agent-autoscaler',
              namespace: 'kube-system',
              uid: '68c11dc3-0164-4916-9e53-52f44a7372a7',
              resourceVersion: '1331',
              generation: 1,
              creationTimestamp: '2022-11-05T00:03:42Z',
              labels: {
                'addonmanager.kubernetes.io/mode': 'Reconcile',
                'k8s-app': 'konnectivity-agent-autoscaler',
                'kubernetes.io/cluster-service': 'true',
              },
              annotations: {
                'components.gke.io/layer': 'addon',
                'deployment.kubernetes.io/revision': '1',
              },
              managedFields: [
                {
                  manager: 'kube-addon-manager',
                  operation: 'Apply',
                  apiVersion: 'apps/v1',
                  time: '2022-11-05T00:03:42Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:annotations': {
                        'f:components.gke.io/layer': {},
                      },
                      'f:labels': {
                        'f:addonmanager.kubernetes.io/mode': {},
                        'f:k8s-app': {},
                        'f:kubernetes.io/cluster-service': {},
                      },
                    },
                    'f:spec': {
                      'f:replicas': {},
                      'f:selector': {},
                      'f:template': {
                        'f:metadata': {
                          'f:annotations': {
                            'f:cluster-autoscaler.kubernetes.io/safe-to-evict': {},
                            'f:components.gke.io/component-name': {},
                            'f:components.gke.io/component-version': {},
                          },
                          'f:labels': {
                            'f:k8s-app': {},
                          },
                        },
                        'f:spec': {
                          'f:containers': {
                            'k:{"name":"autoscaler"}': {
                              '.': {},
                              'f:command': {},
                              'f:image': {},
                              'f:name': {},
                              'f:resources': {
                                'f:requests': {
                                  'f:cpu': {},
                                  'f:memory': {},
                                },
                              },
                              'f:securityContext': {
                                'f:allowPrivilegeEscalation': {},
                                'f:capabilities': {
                                  'f:drop': {},
                                },
                              },
                            },
                          },
                          'f:nodeSelector': {},
                          'f:priorityClassName': {},
                          'f:securityContext': {
                            'f:runAsGroup': {},
                            'f:runAsUser': {},
                            'f:seccompProfile': {
                              'f:type': {},
                            },
                          },
                          'f:serviceAccountName': {},
                          'f:tolerations': {},
                        },
                      },
                    },
                  },
                },
                {
                  manager: 'kube-controller-manager',
                  operation: 'Update',
                  apiVersion: 'apps/v1',
                  time: '2022-11-05T00:04:43Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:annotations': {
                        'f:deployment.kubernetes.io/revision': {},
                      },
                    },
                    'f:status': {
                      'f:availableReplicas': {},
                      'f:conditions': {
                        '.': {},
                        'k:{"type":"Available"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                        'k:{"type":"Progressing"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                      },
                      'f:observedGeneration': {},
                      'f:readyReplicas': {},
                      'f:replicas': {},
                      'f:updatedReplicas': {},
                    },
                  },
                  subresource: 'status',
                },
              ],
            },
            spec: {
              replicas: 1,
              selector: {
                matchLabels: {
                  'k8s-app': 'konnectivity-agent-autoscaler',
                },
              },
              template: {
                metadata: {
                  creationTimestamp: null,
                  labels: {
                    'k8s-app': 'konnectivity-agent-autoscaler',
                  },
                  annotations: {
                    'cluster-autoscaler.kubernetes.io/safe-to-evict': 'true',
                    'components.gke.io/component-name': 'konnectivitynetworkproxy-combined',
                    'components.gke.io/component-version': '1.5.9',
                  },
                },
                spec: {
                  containers: [
                    {
                      name: 'autoscaler',
                      image: 'gke.gcr.io/cluster-proportional-autoscaler:1.8.4-gke.1',
                      command: [
                        '/cluster-proportional-autoscaler',
                        '--namespace=kube-system',
                        '--configmap=konnectivity-agent-autoscaler-config',
                        '--target=deployment/konnectivity-agent',
                        '--logtostderr=true',
                        '--v=2',
                      ],
                      resources: {
                        requests: {
                          cpu: '10m',
                          memory: '10M',
                        },
                      },
                      terminationMessagePath: '/dev/termination-log',
                      terminationMessagePolicy: 'File',
                      imagePullPolicy: 'IfNotPresent',
                      securityContext: {
                        capabilities: {
                          drop: ['all'],
                        },
                        allowPrivilegeEscalation: false,
                      },
                    },
                  ],
                  restartPolicy: 'Always',
                  terminationGracePeriodSeconds: 30,
                  dnsPolicy: 'ClusterFirst',
                  nodeSelector: {
                    'beta.kubernetes.io/os': 'linux',
                  },
                  serviceAccountName: 'konnectivity-agent-cpha',
                  serviceAccount: 'konnectivity-agent-cpha',
                  securityContext: {
                    runAsUser: 1000,
                    runAsGroup: 1000,
                    seccompProfile: {
                      type: 'RuntimeDefault',
                    },
                  },
                  schedulerName: 'default-scheduler',
                  tolerations: [
                    {
                      key: 'CriticalAddonsOnly',
                      operator: 'Exists',
                    },
                    {
                      key: 'components.gke.io/gke-managed-components',
                      operator: 'Exists',
                    },
                    {
                      key: 'kubernetes.io/arch',
                      operator: 'Equal',
                      value: 'arm64',
                      effect: 'NoSchedule',
                    },
                  ],
                  priorityClassName: 'system-cluster-critical',
                },
              },
              strategy: {
                type: 'RollingUpdate',
                rollingUpdate: {
                  maxUnavailable: '25%',
                  maxSurge: '25%',
                },
              },
              revisionHistoryLimit: 10,
              progressDeadlineSeconds: 600,
            },
            status: {
              observedGeneration: 1,
              replicas: 1,
              updatedReplicas: 1,
              readyReplicas: 1,
              availableReplicas: 1,
              conditions: [
                {
                  type: 'Available',
                  status: 'True',
                  lastUpdateTime: '2022-11-05T00:04:43Z',
                  lastTransitionTime: '2022-11-05T00:04:43Z',
                  reason: 'MinimumReplicasAvailable',
                  message: 'Deployment has minimum availability.',
                },
                {
                  type: 'Progressing',
                  status: 'True',
                  lastUpdateTime: '2022-11-05T00:04:43Z',
                  lastTransitionTime: '2022-11-05T00:03:42Z',
                  reason: 'NewReplicaSetAvailable',
                  message:
                    'ReplicaSet "konnectivity-agent-autoscaler-658b588bb6" has successfully progressed.',
                },
              ],
            },
          },
          {
            metadata: {
              name: 'kube-dns',
              namespace: 'kube-system',
              uid: '02496b65-662f-4c4b-82c0-513838d57cc7',
              resourceVersion: '3024394',
              generation: 2,
              creationTimestamp: '2022-11-05T00:03:25Z',
              labels: {
                'addonmanager.kubernetes.io/mode': 'Reconcile',
                'k8s-app': 'kube-dns',
                'kubernetes.io/cluster-service': 'true',
              },
              annotations: {
                'deployment.kubernetes.io/revision': '1',
              },
              managedFields: [
                {
                  manager: 'kube-addon-manager',
                  operation: 'Apply',
                  apiVersion: 'apps/v1',
                  time: '2022-11-09T13:42:27Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:labels': {
                        'f:addonmanager.kubernetes.io/mode': {},
                        'f:k8s-app': {},
                        'f:kubernetes.io/cluster-service': {},
                      },
                    },
                    'f:spec': {
                      'f:selector': {},
                      'f:strategy': {
                        'f:rollingUpdate': {
                          'f:maxSurge': {},
                          'f:maxUnavailable': {},
                        },
                      },
                      'f:template': {
                        'f:metadata': {
                          'f:annotations': {
                            'f:components.gke.io/component-name': {},
                            'f:prometheus.io/port': {},
                            'f:prometheus.io/scrape': {},
                            'f:scheduler.alpha.kubernetes.io/critical-pod': {},
                            'f:seccomp.security.alpha.kubernetes.io/pod': {},
                          },
                          'f:labels': {
                            'f:k8s-app': {},
                          },
                        },
                        'f:spec': {
                          'f:affinity': {
                            'f:podAntiAffinity': {
                              'f:preferredDuringSchedulingIgnoredDuringExecution': {},
                            },
                          },
                          'f:containers': {
                            'k:{"name":"dnsmasq"}': {
                              '.': {},
                              'f:args': {},
                              'f:image': {},
                              'f:livenessProbe': {
                                'f:failureThreshold': {},
                                'f:httpGet': {
                                  'f:path': {},
                                  'f:port': {},
                                  'f:scheme': {},
                                },
                                'f:initialDelaySeconds': {},
                                'f:successThreshold': {},
                                'f:timeoutSeconds': {},
                              },
                              'f:name': {},
                              'f:ports': {
                                'k:{"containerPort":53,"protocol":"TCP"}': {
                                  '.': {},
                                  'f:containerPort': {},
                                  'f:name': {},
                                  'f:protocol': {},
                                },
                                'k:{"containerPort":53,"protocol":"UDP"}': {
                                  '.': {},
                                  'f:containerPort': {},
                                  'f:name': {},
                                  'f:protocol': {},
                                },
                              },
                              'f:resources': {
                                'f:requests': {
                                  'f:cpu': {},
                                  'f:memory': {},
                                },
                              },
                              'f:securityContext': {
                                'f:capabilities': {
                                  'f:add': {},
                                  'f:drop': {},
                                },
                              },
                              'f:volumeMounts': {
                                'k:{"mountPath":"/etc/k8s/dns/dnsmasq-nanny"}': {
                                  '.': {},
                                  'f:mountPath': {},
                                  'f:name': {},
                                },
                              },
                            },
                            'k:{"name":"kubedns"}': {
                              '.': {},
                              'f:args': {},
                              'f:env': {
                                'k:{"name":"PROMETHEUS_PORT"}': {
                                  '.': {},
                                  'f:name': {},
                                  'f:value': {},
                                },
                              },
                              'f:image': {},
                              'f:livenessProbe': {
                                'f:failureThreshold': {},
                                'f:httpGet': {
                                  'f:path': {},
                                  'f:port': {},
                                  'f:scheme': {},
                                },
                                'f:initialDelaySeconds': {},
                                'f:successThreshold': {},
                                'f:timeoutSeconds': {},
                              },
                              'f:name': {},
                              'f:ports': {
                                'k:{"containerPort":10053,"protocol":"TCP"}': {
                                  '.': {},
                                  'f:containerPort': {},
                                  'f:name': {},
                                  'f:protocol': {},
                                },
                                'k:{"containerPort":10053,"protocol":"UDP"}': {
                                  '.': {},
                                  'f:containerPort': {},
                                  'f:name': {},
                                  'f:protocol': {},
                                },
                                'k:{"containerPort":10055,"protocol":"TCP"}': {
                                  '.': {},
                                  'f:containerPort': {},
                                  'f:name': {},
                                  'f:protocol': {},
                                },
                              },
                              'f:readinessProbe': {
                                'f:httpGet': {
                                  'f:path': {},
                                  'f:port': {},
                                  'f:scheme': {},
                                },
                                'f:initialDelaySeconds': {},
                                'f:timeoutSeconds': {},
                              },
                              'f:resources': {
                                'f:limits': {
                                  'f:memory': {},
                                },
                                'f:requests': {
                                  'f:cpu': {},
                                  'f:memory': {},
                                },
                              },
                              'f:securityContext': {
                                'f:allowPrivilegeEscalation': {},
                                'f:readOnlyRootFilesystem': {},
                                'f:runAsGroup': {},
                                'f:runAsUser': {},
                              },
                              'f:volumeMounts': {
                                'k:{"mountPath":"/kube-dns-config"}': {
                                  '.': {},
                                  'f:mountPath': {},
                                  'f:name': {},
                                },
                              },
                            },
                            'k:{"name":"prometheus-to-sd"}': {
                              '.': {},
                              'f:command': {},
                              'f:env': {
                                'k:{"name":"POD_NAME"}': {
                                  '.': {},
                                  'f:name': {},
                                  'f:valueFrom': {
                                    'f:fieldRef': {},
                                  },
                                },
                                'k:{"name":"POD_NAMESPACE"}': {
                                  '.': {},
                                  'f:name': {},
                                  'f:valueFrom': {
                                    'f:fieldRef': {},
                                  },
                                },
                              },
                              'f:image': {},
                              'f:name': {},
                              'f:securityContext': {
                                'f:allowPrivilegeEscalation': {},
                                'f:readOnlyRootFilesystem': {},
                                'f:runAsGroup': {},
                                'f:runAsUser': {},
                              },
                            },
                            'k:{"name":"sidecar"}': {
                              '.': {},
                              'f:args': {},
                              'f:image': {},
                              'f:livenessProbe': {
                                'f:failureThreshold': {},
                                'f:httpGet': {
                                  'f:path': {},
                                  'f:port': {},
                                  'f:scheme': {},
                                },
                                'f:initialDelaySeconds': {},
                                'f:successThreshold': {},
                                'f:timeoutSeconds': {},
                              },
                              'f:name': {},
                              'f:ports': {
                                'k:{"containerPort":10054,"protocol":"TCP"}': {
                                  '.': {},
                                  'f:containerPort': {},
                                  'f:name': {},
                                  'f:protocol': {},
                                },
                              },
                              'f:resources': {
                                'f:requests': {
                                  'f:cpu': {},
                                  'f:memory': {},
                                },
                              },
                              'f:securityContext': {
                                'f:allowPrivilegeEscalation': {},
                                'f:readOnlyRootFilesystem': {},
                                'f:runAsGroup': {},
                                'f:runAsUser': {},
                              },
                            },
                          },
                          'f:dnsPolicy': {},
                          'f:nodeSelector': {},
                          'f:priorityClassName': {},
                          'f:securityContext': {
                            'f:fsGroup': {},
                            'f:supplementalGroups': {},
                          },
                          'f:serviceAccountName': {},
                          'f:tolerations': {},
                          'f:volumes': {
                            'k:{"name":"kube-dns-config"}': {
                              '.': {},
                              'f:configMap': {
                                'f:name': {},
                                'f:optional': {},
                              },
                              'f:name': {},
                            },
                          },
                        },
                      },
                    },
                  },
                },
                {
                  manager: 'kube-controller-manager',
                  operation: 'Update',
                  apiVersion: 'apps/v1',
                  time: '2022-11-05T00:05:01Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:annotations': {
                        '.': {},
                        'f:deployment.kubernetes.io/revision': {},
                      },
                    },
                    'f:status': {
                      'f:availableReplicas': {},
                      'f:conditions': {
                        '.': {},
                        'k:{"type":"Available"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                        'k:{"type":"Progressing"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                      },
                      'f:observedGeneration': {},
                      'f:readyReplicas': {},
                      'f:replicas': {},
                      'f:updatedReplicas': {},
                    },
                  },
                  subresource: 'status',
                },
              ],
            },
            spec: {
              replicas: 2,
              selector: {
                matchLabels: {
                  'k8s-app': 'kube-dns',
                },
              },
              template: {
                metadata: {
                  creationTimestamp: null,
                  labels: {
                    'k8s-app': 'kube-dns',
                  },
                  annotations: {
                    'components.gke.io/component-name': 'kubedns',
                    'prometheus.io/port': '10054',
                    'prometheus.io/scrape': 'true',
                    'scheduler.alpha.kubernetes.io/critical-pod': '',
                    'seccomp.security.alpha.kubernetes.io/pod': 'runtime/default',
                  },
                },
                spec: {
                  volumes: [
                    {
                      name: 'kube-dns-config',
                      configMap: {
                        name: 'kube-dns',
                        defaultMode: 420,
                        optional: true,
                      },
                    },
                  ],
                  containers: [
                    {
                      name: 'kubedns',
                      image: 'gke.gcr.io/k8s-dns-kube-dns:1.22.3-gke.0',
                      args: [
                        '--domain=cluster.local.',
                        '--dns-port=10053',
                        '--config-dir=/kube-dns-config',
                        '--v=2',
                      ],
                      ports: [
                        {
                          name: 'dns-local',
                          containerPort: 10053,
                          protocol: 'UDP',
                        },
                        {
                          name: 'dns-tcp-local',
                          containerPort: 10053,
                          protocol: 'TCP',
                        },
                        {
                          name: 'metrics',
                          containerPort: 10055,
                          protocol: 'TCP',
                        },
                      ],
                      env: [
                        {
                          name: 'PROMETHEUS_PORT',
                          value: '10055',
                        },
                      ],
                      resources: {
                        limits: {
                          memory: '210Mi',
                        },
                        requests: {
                          cpu: '100m',
                          memory: '70Mi',
                        },
                      },
                      volumeMounts: [
                        {
                          name: 'kube-dns-config',
                          mountPath: '/kube-dns-config',
                        },
                      ],
                      livenessProbe: {
                        httpGet: {
                          path: '/healthcheck/kubedns',
                          port: 10054,
                          scheme: 'HTTP',
                        },
                        initialDelaySeconds: 60,
                        timeoutSeconds: 5,
                        periodSeconds: 10,
                        successThreshold: 1,
                        failureThreshold: 5,
                      },
                      readinessProbe: {
                        httpGet: {
                          path: '/readiness',
                          port: 8081,
                          scheme: 'HTTP',
                        },
                        initialDelaySeconds: 3,
                        timeoutSeconds: 5,
                        periodSeconds: 10,
                        successThreshold: 1,
                        failureThreshold: 3,
                      },
                      terminationMessagePath: '/dev/termination-log',
                      terminationMessagePolicy: 'File',
                      imagePullPolicy: 'IfNotPresent',
                      securityContext: {
                        runAsUser: 1001,
                        runAsGroup: 1001,
                        readOnlyRootFilesystem: true,
                        allowPrivilegeEscalation: false,
                      },
                    },
                    {
                      name: 'dnsmasq',
                      image: 'gke.gcr.io/k8s-dns-dnsmasq-nanny:1.22.3-gke.0',
                      args: [
                        '-v=2',
                        '-logtostderr',
                        '-configDir=/etc/k8s/dns/dnsmasq-nanny',
                        '-restartDnsmasq=true',
                        '--',
                        '-k',
                        '--cache-size=1000',
                        '--no-negcache',
                        '--dns-forward-max=1500',
                        '--log-facility=-',
                        '--server=/cluster.local/127.0.0.1#10053',
                        '--server=/in-addr.arpa/127.0.0.1#10053',
                        '--server=/ip6.arpa/127.0.0.1#10053',
                      ],
                      ports: [
                        {
                          name: 'dns',
                          containerPort: 53,
                          protocol: 'UDP',
                        },
                        {
                          name: 'dns-tcp',
                          containerPort: 53,
                          protocol: 'TCP',
                        },
                      ],
                      resources: {
                        requests: {
                          cpu: '150m',
                          memory: '20Mi',
                        },
                      },
                      volumeMounts: [
                        {
                          name: 'kube-dns-config',
                          mountPath: '/etc/k8s/dns/dnsmasq-nanny',
                        },
                      ],
                      livenessProbe: {
                        httpGet: {
                          path: '/healthcheck/dnsmasq',
                          port: 10054,
                          scheme: 'HTTP',
                        },
                        initialDelaySeconds: 60,
                        timeoutSeconds: 5,
                        periodSeconds: 10,
                        successThreshold: 1,
                        failureThreshold: 5,
                      },
                      terminationMessagePath: '/dev/termination-log',
                      terminationMessagePolicy: 'File',
                      imagePullPolicy: 'IfNotPresent',
                      securityContext: {
                        capabilities: {
                          add: ['NET_BIND_SERVICE', 'SETGID'],
                          drop: ['all'],
                        },
                      },
                    },
                    {
                      name: 'sidecar',
                      image: 'gke.gcr.io/k8s-dns-sidecar:1.22.3-gke.0',
                      args: [
                        '--v=2',
                        '--logtostderr',
                        '--probe=kubedns,127.0.0.1:10053,kubernetes.default.svc.cluster.local,5,SRV',
                        '--probe=dnsmasq,127.0.0.1:53,kubernetes.default.svc.cluster.local,5,SRV',
                      ],
                      ports: [
                        {
                          name: 'metrics',
                          containerPort: 10054,
                          protocol: 'TCP',
                        },
                      ],
                      resources: {
                        requests: {
                          cpu: '10m',
                          memory: '20Mi',
                        },
                      },
                      livenessProbe: {
                        httpGet: {
                          path: '/metrics',
                          port: 10054,
                          scheme: 'HTTP',
                        },
                        initialDelaySeconds: 60,
                        timeoutSeconds: 5,
                        periodSeconds: 10,
                        successThreshold: 1,
                        failureThreshold: 5,
                      },
                      terminationMessagePath: '/dev/termination-log',
                      terminationMessagePolicy: 'File',
                      imagePullPolicy: 'IfNotPresent',
                      securityContext: {
                        runAsUser: 1001,
                        runAsGroup: 1001,
                        readOnlyRootFilesystem: true,
                        allowPrivilegeEscalation: false,
                      },
                    },
                    {
                      name: 'prometheus-to-sd',
                      image: 'gke.gcr.io/prometheus-to-sd:v0.11.3-gke.0',
                      command: [
                        '/monitor',
                        '--source=kubedns:http://localhost:10054?whitelisted=probe_kubedns_latency_ms,probe_kubedns_errors,dnsmasq_misses,dnsmasq_hits',
                        '--stackdriver-prefix=container.googleapis.com/internal/addons',
                        '--api-override=https://monitoring.googleapis.com/',
                        '--pod-id=$(POD_NAME)',
                        '--namespace-id=$(POD_NAMESPACE)',
                        '--v=2',
                      ],
                      env: [
                        {
                          name: 'POD_NAME',
                          valueFrom: {
                            fieldRef: {
                              apiVersion: 'v1',
                              fieldPath: 'metadata.name',
                            },
                          },
                        },
                        {
                          name: 'POD_NAMESPACE',
                          valueFrom: {
                            fieldRef: {
                              apiVersion: 'v1',
                              fieldPath: 'metadata.namespace',
                            },
                          },
                        },
                      ],
                      resources: {},
                      terminationMessagePath: '/dev/termination-log',
                      terminationMessagePolicy: 'File',
                      imagePullPolicy: 'IfNotPresent',
                      securityContext: {
                        runAsUser: 1001,
                        runAsGroup: 1001,
                        readOnlyRootFilesystem: true,
                        allowPrivilegeEscalation: false,
                      },
                    },
                  ],
                  restartPolicy: 'Always',
                  terminationGracePeriodSeconds: 30,
                  dnsPolicy: 'Default',
                  nodeSelector: {
                    'kubernetes.io/os': 'linux',
                  },
                  serviceAccountName: 'kube-dns',
                  serviceAccount: 'kube-dns',
                  securityContext: {
                    supplementalGroups: [65534],
                    fsGroup: 65534,
                  },
                  affinity: {
                    podAntiAffinity: {
                      preferredDuringSchedulingIgnoredDuringExecution: [
                        {
                          weight: 100,
                          podAffinityTerm: {
                            labelSelector: {
                              matchExpressions: [
                                {
                                  key: 'k8s-app',
                                  operator: 'In',
                                  values: ['kube-dns'],
                                },
                              ],
                            },
                            topologyKey: 'kubernetes.io/hostname',
                          },
                        },
                      ],
                    },
                  },
                  schedulerName: 'default-scheduler',
                  tolerations: [
                    {
                      key: 'CriticalAddonsOnly',
                      operator: 'Exists',
                    },
                    {
                      key: 'components.gke.io/gke-managed-components',
                      operator: 'Exists',
                    },
                    {
                      key: 'kubernetes.io/arch',
                      operator: 'Equal',
                      value: 'arm64',
                      effect: 'NoSchedule',
                    },
                  ],
                  priorityClassName: 'system-cluster-critical',
                },
              },
              strategy: {
                type: 'RollingUpdate',
                rollingUpdate: {
                  maxUnavailable: 0,
                  maxSurge: '10%',
                },
              },
              revisionHistoryLimit: 10,
              progressDeadlineSeconds: 600,
            },
            status: {
              observedGeneration: 2,
              replicas: 2,
              updatedReplicas: 2,
              readyReplicas: 2,
              availableReplicas: 2,
              conditions: [
                {
                  type: 'Available',
                  status: 'True',
                  lastUpdateTime: '2022-11-05T00:05:01Z',
                  lastTransitionTime: '2022-11-05T00:05:01Z',
                  reason: 'MinimumReplicasAvailable',
                  message: 'Deployment has minimum availability.',
                },
                {
                  type: 'Progressing',
                  status: 'True',
                  lastUpdateTime: '2022-11-05T00:05:01Z',
                  lastTransitionTime: '2022-11-05T00:03:25Z',
                  reason: 'NewReplicaSetAvailable',
                  message: 'ReplicaSet "kube-dns-b8976dfcd" has successfully progressed.',
                },
              ],
            },
          },
          {
            metadata: {
              name: 'kube-dns-autoscaler',
              namespace: 'kube-system',
              uid: 'e58ee71d-f690-48ac-80aa-fbd791b918d6',
              resourceVersion: '1280',
              generation: 1,
              creationTimestamp: '2022-11-05T00:03:27Z',
              labels: {
                'addonmanager.kubernetes.io/mode': 'Reconcile',
                'k8s-app': 'kube-dns-autoscaler',
                'kubernetes.io/cluster-service': 'true',
              },
              annotations: {
                'deployment.kubernetes.io/revision': '1',
              },
              managedFields: [
                {
                  manager: 'kube-addon-manager',
                  operation: 'Apply',
                  apiVersion: 'apps/v1',
                  time: '2022-11-05T00:03:27Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:labels': {
                        'f:addonmanager.kubernetes.io/mode': {},
                        'f:k8s-app': {},
                        'f:kubernetes.io/cluster-service': {},
                      },
                    },
                    'f:spec': {
                      'f:selector': {},
                      'f:template': {
                        'f:metadata': {
                          'f:labels': {
                            'f:k8s-app': {},
                          },
                        },
                        'f:spec': {
                          'f:containers': {
                            'k:{"name":"autoscaler"}': {
                              '.': {},
                              'f:command': {},
                              'f:image': {},
                              'f:name': {},
                              'f:resources': {
                                'f:requests': {
                                  'f:cpu': {},
                                  'f:memory': {},
                                },
                              },
                            },
                          },
                          'f:nodeSelector': {},
                          'f:priorityClassName': {},
                          'f:securityContext': {
                            'f:fsGroup': {},
                            'f:seccompProfile': {
                              'f:type': {},
                            },
                            'f:supplementalGroups': {},
                          },
                          'f:serviceAccountName': {},
                          'f:tolerations': {},
                        },
                      },
                    },
                  },
                },
                {
                  manager: 'kube-controller-manager',
                  operation: 'Update',
                  apiVersion: 'apps/v1',
                  time: '2022-11-05T00:04:40Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:annotations': {
                        '.': {},
                        'f:deployment.kubernetes.io/revision': {},
                      },
                    },
                    'f:status': {
                      'f:availableReplicas': {},
                      'f:conditions': {
                        '.': {},
                        'k:{"type":"Available"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                        'k:{"type":"Progressing"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                      },
                      'f:observedGeneration': {},
                      'f:readyReplicas': {},
                      'f:replicas': {},
                      'f:updatedReplicas': {},
                    },
                  },
                  subresource: 'status',
                },
              ],
            },
            spec: {
              replicas: 1,
              selector: {
                matchLabels: {
                  'k8s-app': 'kube-dns-autoscaler',
                },
              },
              template: {
                metadata: {
                  creationTimestamp: null,
                  labels: {
                    'k8s-app': 'kube-dns-autoscaler',
                  },
                },
                spec: {
                  containers: [
                    {
                      name: 'autoscaler',
                      image: 'gke.gcr.io/cluster-proportional-autoscaler:1.8.4-gke.1',
                      command: [
                        '/cluster-proportional-autoscaler',
                        '--namespace=kube-system',
                        '--configmap=kube-dns-autoscaler',
                        '--target=Deployment/kube-dns',
                        '--default-params={"linear":{"coresPerReplica":256,"nodesPerReplica":16,"preventSinglePointFailure":true,"includeUnschedulableNodes":true}}',
                        '--logtostderr=true',
                        '--v=2',
                      ],
                      resources: {
                        requests: {
                          cpu: '20m',
                          memory: '10Mi',
                        },
                      },
                      terminationMessagePath: '/dev/termination-log',
                      terminationMessagePolicy: 'File',
                      imagePullPolicy: 'IfNotPresent',
                    },
                  ],
                  restartPolicy: 'Always',
                  terminationGracePeriodSeconds: 30,
                  dnsPolicy: 'ClusterFirst',
                  nodeSelector: {
                    'kubernetes.io/os': 'linux',
                  },
                  serviceAccountName: 'kube-dns-autoscaler',
                  serviceAccount: 'kube-dns-autoscaler',
                  securityContext: {
                    supplementalGroups: [65534],
                    fsGroup: 65534,
                    seccompProfile: {
                      type: 'RuntimeDefault',
                    },
                  },
                  schedulerName: 'default-scheduler',
                  tolerations: [
                    {
                      key: 'CriticalAddonsOnly',
                      operator: 'Exists',
                    },
                    {
                      key: 'components.gke.io/gke-managed-components',
                      operator: 'Exists',
                    },
                    {
                      key: 'kubernetes.io/arch',
                      operator: 'Equal',
                      value: 'arm64',
                      effect: 'NoSchedule',
                    },
                  ],
                  priorityClassName: 'system-cluster-critical',
                },
              },
              strategy: {
                type: 'RollingUpdate',
                rollingUpdate: {
                  maxUnavailable: '25%',
                  maxSurge: '25%',
                },
              },
              revisionHistoryLimit: 10,
              progressDeadlineSeconds: 600,
            },
            status: {
              observedGeneration: 1,
              replicas: 1,
              updatedReplicas: 1,
              readyReplicas: 1,
              availableReplicas: 1,
              conditions: [
                {
                  type: 'Available',
                  status: 'True',
                  lastUpdateTime: '2022-11-05T00:04:40Z',
                  lastTransitionTime: '2022-11-05T00:04:40Z',
                  reason: 'MinimumReplicasAvailable',
                  message: 'Deployment has minimum availability.',
                },
                {
                  type: 'Progressing',
                  status: 'True',
                  lastUpdateTime: '2022-11-05T00:04:40Z',
                  lastTransitionTime: '2022-11-05T00:03:27Z',
                  reason: 'NewReplicaSetAvailable',
                  message:
                    'ReplicaSet "kube-dns-autoscaler-fbc66b884" has successfully progressed.',
                },
              ],
            },
          },
          {
            metadata: {
              name: 'l7-default-backend',
              namespace: 'kube-system',
              uid: '5f079165-f480-466b-8681-341c746e0233',
              resourceVersion: '1390',
              generation: 1,
              creationTimestamp: '2022-11-05T00:03:45Z',
              labels: {
                'addonmanager.kubernetes.io/mode': 'Reconcile',
                'k8s-app': 'glbc',
                'kubernetes.io/cluster-service': 'true',
                'kubernetes.io/name': 'GLBC',
              },
              annotations: {
                'components.gke.io/layer': 'addon',
                'deployment.kubernetes.io/revision': '1',
                'seccomp.security.alpha.kubernetes.io/pod': 'runtime/default',
              },
              managedFields: [
                {
                  manager: 'kube-addon-manager',
                  operation: 'Apply',
                  apiVersion: 'apps/v1',
                  time: '2022-11-05T00:03:45Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:annotations': {
                        'f:components.gke.io/layer': {},
                        'f:seccomp.security.alpha.kubernetes.io/pod': {},
                      },
                      'f:labels': {
                        'f:addonmanager.kubernetes.io/mode': {},
                        'f:k8s-app': {},
                        'f:kubernetes.io/cluster-service': {},
                        'f:kubernetes.io/name': {},
                      },
                    },
                    'f:spec': {
                      'f:selector': {},
                      'f:template': {
                        'f:metadata': {
                          'f:annotations': {
                            'f:components.gke.io/component-name': {},
                            'f:components.gke.io/component-version': {},
                            'f:seccomp.security.alpha.kubernetes.io/pod': {},
                          },
                          'f:labels': {
                            'f:k8s-app': {},
                            'f:name': {},
                          },
                        },
                        'f:spec': {
                          'f:containers': {
                            'k:{"name":"default-http-backend"}': {
                              '.': {},
                              'f:image': {},
                              'f:livenessProbe': {
                                'f:httpGet': {
                                  'f:path': {},
                                  'f:port': {},
                                  'f:scheme': {},
                                },
                                'f:initialDelaySeconds': {},
                                'f:timeoutSeconds': {},
                              },
                              'f:name': {},
                              'f:ports': {
                                'k:{"containerPort":8080,"protocol":"TCP"}': {
                                  '.': {},
                                  'f:containerPort': {},
                                },
                              },
                              'f:resources': {
                                'f:requests': {
                                  'f:cpu': {},
                                  'f:memory': {},
                                },
                              },
                              'f:securityContext': {
                                'f:allowPrivilegeEscalation': {},
                                'f:capabilities': {
                                  'f:drop': {},
                                },
                                'f:runAsGroup': {},
                                'f:runAsUser': {},
                              },
                            },
                          },
                          'f:tolerations': {},
                        },
                      },
                    },
                  },
                },
                {
                  manager: 'kube-controller-manager',
                  operation: 'Update',
                  apiVersion: 'apps/v1',
                  time: '2022-11-05T00:04:49Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:annotations': {
                        'f:deployment.kubernetes.io/revision': {},
                      },
                    },
                    'f:status': {
                      'f:availableReplicas': {},
                      'f:conditions': {
                        '.': {},
                        'k:{"type":"Available"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                        'k:{"type":"Progressing"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                      },
                      'f:observedGeneration': {},
                      'f:readyReplicas': {},
                      'f:replicas': {},
                      'f:updatedReplicas': {},
                    },
                  },
                  subresource: 'status',
                },
              ],
            },
            spec: {
              replicas: 1,
              selector: {
                matchLabels: {
                  'k8s-app': 'glbc',
                },
              },
              template: {
                metadata: {
                  creationTimestamp: null,
                  labels: {
                    'k8s-app': 'glbc',
                    name: 'glbc',
                  },
                  annotations: {
                    'components.gke.io/component-name': 'l7-lb-controller-combined',
                    'components.gke.io/component-version': '1.15.3-gke.0',
                    'seccomp.security.alpha.kubernetes.io/pod': 'runtime/default',
                  },
                },
                spec: {
                  containers: [
                    {
                      name: 'default-http-backend',
                      image: 'gke.gcr.io/ingress-gce-404-server-with-metrics:v1.13.4',
                      ports: [
                        {
                          containerPort: 8080,
                          protocol: 'TCP',
                        },
                      ],
                      resources: {
                        requests: {
                          cpu: '10m',
                          memory: '20Mi',
                        },
                      },
                      livenessProbe: {
                        httpGet: {
                          path: '/healthz',
                          port: 8080,
                          scheme: 'HTTP',
                        },
                        initialDelaySeconds: 30,
                        timeoutSeconds: 5,
                        periodSeconds: 10,
                        successThreshold: 1,
                        failureThreshold: 3,
                      },
                      terminationMessagePath: '/dev/termination-log',
                      terminationMessagePolicy: 'File',
                      imagePullPolicy: 'IfNotPresent',
                      securityContext: {
                        capabilities: {
                          drop: ['all'],
                        },
                        runAsUser: 1000,
                        runAsGroup: 1000,
                        allowPrivilegeEscalation: false,
                      },
                    },
                  ],
                  restartPolicy: 'Always',
                  terminationGracePeriodSeconds: 30,
                  dnsPolicy: 'ClusterFirst',
                  securityContext: {},
                  schedulerName: 'default-scheduler',
                  tolerations: [
                    {
                      key: 'kubernetes.io/arch',
                      operator: 'Equal',
                      value: 'arm64',
                      effect: 'NoSchedule',
                    },
                    {
                      key: 'components.gke.io/gke-managed-components',
                      operator: 'Exists',
                    },
                  ],
                },
              },
              strategy: {
                type: 'RollingUpdate',
                rollingUpdate: {
                  maxUnavailable: '25%',
                  maxSurge: '25%',
                },
              },
              revisionHistoryLimit: 10,
              progressDeadlineSeconds: 600,
            },
            status: {
              observedGeneration: 1,
              replicas: 1,
              updatedReplicas: 1,
              readyReplicas: 1,
              availableReplicas: 1,
              conditions: [
                {
                  type: 'Available',
                  status: 'True',
                  lastUpdateTime: '2022-11-05T00:04:49Z',
                  lastTransitionTime: '2022-11-05T00:04:49Z',
                  reason: 'MinimumReplicasAvailable',
                  message: 'Deployment has minimum availability.',
                },
                {
                  type: 'Progressing',
                  status: 'True',
                  lastUpdateTime: '2022-11-05T00:04:49Z',
                  lastTransitionTime: '2022-11-05T00:03:45Z',
                  reason: 'NewReplicaSetAvailable',
                  message:
                    'ReplicaSet "l7-default-backend-6b99559c7d" has successfully progressed.',
                },
              ],
            },
          },
          {
            metadata: {
              name: 'metrics-server-v0.5.2',
              namespace: 'kube-system',
              uid: 'b023e309-f020-4329-a0fd-923056969cd2',
              resourceVersion: '3024560',
              generation: 2,
              creationTimestamp: '2022-11-05T00:03:49Z',
              labels: {
                'addonmanager.kubernetes.io/mode': 'Reconcile',
                'k8s-app': 'metrics-server',
                version: 'v0.5.2',
              },
              annotations: {
                'components.gke.io/layer': 'addon',
                'deployment.kubernetes.io/revision': '2',
              },
              managedFields: [
                {
                  manager: 'kube-addon-manager',
                  operation: 'Apply',
                  apiVersion: 'apps/v1',
                  time: '2022-11-09T13:42:47Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:annotations': {
                        'f:components.gke.io/layer': {},
                      },
                      'f:labels': {
                        'f:addonmanager.kubernetes.io/mode': {},
                        'f:k8s-app': {},
                        'f:version': {},
                      },
                    },
                    'f:spec': {
                      'f:selector': {},
                      'f:template': {
                        'f:metadata': {
                          'f:annotations': {
                            'f:components.gke.io/component-name': {},
                            'f:components.gke.io/component-version': {},
                          },
                          'f:labels': {
                            'f:k8s-app': {},
                            'f:version': {},
                          },
                          'f:name': {},
                        },
                        'f:spec': {
                          'f:containers': {
                            'k:{"name":"metrics-server"}': {
                              '.': {},
                              'f:command': {},
                              'f:image': {},
                              'f:name': {},
                              'f:ports': {
                                'k:{"containerPort":10250,"protocol":"TCP"}': {
                                  '.': {},
                                  'f:containerPort': {},
                                  'f:name': {},
                                  'f:protocol': {},
                                },
                              },
                              'f:securityContext': {
                                'f:allowPrivilegeEscalation': {},
                                'f:capabilities': {
                                  'f:drop': {},
                                },
                                'f:readOnlyRootFilesystem': {},
                                'f:runAsGroup': {},
                                'f:runAsUser': {},
                                'f:seccompProfile': {
                                  'f:type': {},
                                },
                              },
                              'f:volumeMounts': {
                                'k:{"mountPath":"/tmp"}': {
                                  '.': {},
                                  'f:mountPath': {},
                                  'f:name': {},
                                },
                              },
                            },
                            'k:{"name":"metrics-server-nanny"}': {
                              '.': {},
                              'f:command': {},
                              'f:env': {
                                'k:{"name":"MY_POD_NAME"}': {
                                  '.': {},
                                  'f:name': {},
                                  'f:valueFrom': {
                                    'f:fieldRef': {},
                                  },
                                },
                                'k:{"name":"MY_POD_NAMESPACE"}': {
                                  '.': {},
                                  'f:name': {},
                                  'f:valueFrom': {
                                    'f:fieldRef': {},
                                  },
                                },
                              },
                              'f:image': {},
                              'f:name': {},
                              'f:resources': {
                                'f:limits': {
                                  'f:memory': {},
                                },
                                'f:requests': {
                                  'f:cpu': {},
                                  'f:memory': {},
                                },
                              },
                              'f:securityContext': {
                                'f:allowPrivilegeEscalation': {},
                                'f:capabilities': {
                                  'f:drop': {},
                                },
                                'f:readOnlyRootFilesystem': {},
                                'f:runAsGroup': {},
                                'f:runAsUser': {},
                                'f:seccompProfile': {
                                  'f:type': {},
                                },
                              },
                              'f:volumeMounts': {
                                'k:{"mountPath":"/etc/config"}': {
                                  '.': {},
                                  'f:mountPath': {},
                                  'f:name': {},
                                },
                              },
                            },
                          },
                          'f:nodeSelector': {},
                          'f:priorityClassName': {},
                          'f:serviceAccountName': {},
                          'f:tolerations': {},
                          'f:volumes': {
                            'k:{"name":"metrics-server-config-volume"}': {
                              '.': {},
                              'f:configMap': {
                                'f:name': {},
                              },
                              'f:name': {},
                            },
                            'k:{"name":"tmp-dir"}': {
                              '.': {},
                              'f:emptyDir': {},
                              'f:name': {},
                            },
                          },
                        },
                      },
                    },
                  },
                },
                {
                  manager: 'pod_nanny',
                  operation: 'Update',
                  apiVersion: 'apps/v1',
                  time: '2022-11-05T00:04:58Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:spec': {
                      'f:template': {
                        'f:spec': {
                          'f:containers': {
                            'k:{"name":"metrics-server"}': {
                              'f:resources': {
                                'f:limits': {
                                  '.': {},
                                  'f:cpu': {},
                                  'f:memory': {},
                                },
                                'f:requests': {
                                  '.': {},
                                  'f:cpu': {},
                                  'f:memory': {},
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                {
                  manager: 'kube-controller-manager',
                  operation: 'Update',
                  apiVersion: 'apps/v1',
                  time: '2022-11-05T00:05:10Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:annotations': {
                        'f:deployment.kubernetes.io/revision': {},
                      },
                    },
                    'f:status': {
                      'f:availableReplicas': {},
                      'f:conditions': {
                        '.': {},
                        'k:{"type":"Available"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                        'k:{"type":"Progressing"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                      },
                      'f:observedGeneration': {},
                      'f:readyReplicas': {},
                      'f:replicas': {},
                      'f:updatedReplicas': {},
                    },
                  },
                  subresource: 'status',
                },
              ],
            },
            spec: {
              replicas: 1,
              selector: {
                matchLabels: {
                  'k8s-app': 'metrics-server',
                  version: 'v0.5.2',
                },
              },
              template: {
                metadata: {
                  name: 'metrics-server',
                  creationTimestamp: null,
                  labels: {
                    'k8s-app': 'metrics-server',
                    version: 'v0.5.2',
                  },
                  annotations: {
                    'components.gke.io/component-name': 'metrics-server',
                    'components.gke.io/component-version': '0.5.2-gke.7',
                  },
                },
                spec: {
                  volumes: [
                    {
                      name: 'metrics-server-config-volume',
                      configMap: {
                        name: 'metrics-server-config',
                        defaultMode: 420,
                      },
                    },
                    {
                      name: 'tmp-dir',
                      emptyDir: {},
                    },
                  ],
                  containers: [
                    {
                      name: 'metrics-server',
                      image: 'gke.gcr.io/metrics-server:v0.5.2-gke.1',
                      command: [
                        '/metrics-server',
                        '--metric-resolution=30s',
                        '--kubelet-port=10255',
                        '--deprecated-kubelet-completely-insecure=true',
                        '--kubelet-preferred-address-types=InternalIP,Hostname,InternalDNS,ExternalDNS,ExternalIP',
                        '--cert-dir=/tmp',
                        '--secure-port=10250',
                      ],
                      ports: [
                        {
                          name: 'https',
                          containerPort: 10250,
                          protocol: 'TCP',
                        },
                      ],
                      resources: {
                        limits: {
                          cpu: '43m',
                          memory: '55Mi',
                        },
                        requests: {
                          cpu: '43m',
                          memory: '55Mi',
                        },
                      },
                      volumeMounts: [
                        {
                          name: 'tmp-dir',
                          mountPath: '/tmp',
                        },
                      ],
                      terminationMessagePath: '/dev/termination-log',
                      terminationMessagePolicy: 'File',
                      imagePullPolicy: 'IfNotPresent',
                      securityContext: {
                        capabilities: {
                          drop: ['ALL'],
                        },
                        runAsUser: 1000,
                        runAsGroup: 1000,
                        readOnlyRootFilesystem: true,
                        allowPrivilegeEscalation: false,
                        seccompProfile: {
                          type: 'RuntimeDefault',
                        },
                      },
                    },
                    {
                      name: 'metrics-server-nanny',
                      image: 'gke.gcr.io/addon-resizer:1.8.14-gke.3',
                      command: [
                        '/pod_nanny',
                        '--config-dir=/etc/config',
                        '--cpu=40m',
                        '--extra-cpu=0.5m',
                        '--memory=35Mi',
                        '--extra-memory=4Mi',
                        '--threshold=5',
                        '--deployment=metrics-server-v0.5.2',
                        '--container=metrics-server',
                        '--poll-period=30000',
                        '--estimator=exponential',
                        '--scale-down-delay=24h',
                        '--minClusterSize=5',
                        '--use-metrics=true',
                      ],
                      env: [
                        {
                          name: 'MY_POD_NAME',
                          valueFrom: {
                            fieldRef: {
                              apiVersion: 'v1',
                              fieldPath: 'metadata.name',
                            },
                          },
                        },
                        {
                          name: 'MY_POD_NAMESPACE',
                          valueFrom: {
                            fieldRef: {
                              apiVersion: 'v1',
                              fieldPath: 'metadata.namespace',
                            },
                          },
                        },
                      ],
                      resources: {
                        limits: {
                          memory: '300Mi',
                        },
                        requests: {
                          cpu: '5m',
                          memory: '50Mi',
                        },
                      },
                      volumeMounts: [
                        {
                          name: 'metrics-server-config-volume',
                          mountPath: '/etc/config',
                        },
                      ],
                      terminationMessagePath: '/dev/termination-log',
                      terminationMessagePolicy: 'File',
                      imagePullPolicy: 'IfNotPresent',
                      securityContext: {
                        capabilities: {
                          drop: ['ALL'],
                        },
                        runAsUser: 1000,
                        runAsGroup: 1000,
                        readOnlyRootFilesystem: true,
                        allowPrivilegeEscalation: false,
                        seccompProfile: {
                          type: 'RuntimeDefault',
                        },
                      },
                    },
                  ],
                  restartPolicy: 'Always',
                  terminationGracePeriodSeconds: 30,
                  dnsPolicy: 'ClusterFirst',
                  nodeSelector: {
                    'kubernetes.io/os': 'linux',
                  },
                  serviceAccountName: 'metrics-server',
                  serviceAccount: 'metrics-server',
                  securityContext: {},
                  schedulerName: 'default-scheduler',
                  tolerations: [
                    {
                      key: 'CriticalAddonsOnly',
                      operator: 'Exists',
                    },
                    {
                      key: 'components.gke.io/gke-managed-components',
                      operator: 'Exists',
                    },
                    {
                      key: 'kubernetes.io/arch',
                      operator: 'Equal',
                      value: 'arm64',
                      effect: 'NoSchedule',
                    },
                  ],
                  priorityClassName: 'system-cluster-critical',
                },
              },
              strategy: {
                type: 'RollingUpdate',
                rollingUpdate: {
                  maxUnavailable: '25%',
                  maxSurge: '25%',
                },
              },
              revisionHistoryLimit: 10,
              progressDeadlineSeconds: 600,
            },
            status: {
              observedGeneration: 2,
              replicas: 1,
              updatedReplicas: 1,
              readyReplicas: 1,
              availableReplicas: 1,
              conditions: [
                {
                  type: 'Available',
                  status: 'True',
                  lastUpdateTime: '2022-11-05T00:04:58Z',
                  lastTransitionTime: '2022-11-05T00:04:58Z',
                  reason: 'MinimumReplicasAvailable',
                  message: 'Deployment has minimum availability.',
                },
                {
                  type: 'Progressing',
                  status: 'True',
                  lastUpdateTime: '2022-11-05T00:05:10Z',
                  lastTransitionTime: '2022-11-05T00:03:49Z',
                  reason: 'NewReplicaSetAvailable',
                  message:
                    'ReplicaSet "metrics-server-v0.5.2-866bc7fbf8" has successfully progressed.',
                },
              ],
            },
          },
          {
            metadata: {
              name: 'memcached-operator2-controller-manager',
              namespace: 'memcached-operator2-system',
              uid: '76b75f9e-3787-4012-88bb-9da42d322f8e',
              resourceVersion: '3025218',
              generation: 1,
              creationTimestamp: '2022-11-07T18:53:28Z',
              labels: {
                'app.kubernetes.io/component': 'manager',
                'app.kubernetes.io/created-by': 'memcached-operator2',
                'app.kubernetes.io/instance': 'controller-manager',
                'app.kubernetes.io/managed-by': 'kustomize',
                'app.kubernetes.io/name': 'deployment',
                'app.kubernetes.io/part-of': 'memcached-operator2',
                'control-plane': 'controller-manager',
              },
              annotations: {
                'deployment.kubernetes.io/revision': '1',
                'kubectl.kubernetes.io/last-applied-configuration':
                  '{"apiVersion":"apps/v1","kind":"Deployment","metadata":{"annotations":{},"labels":{"app.kubernetes.io/component":"manager","app.kubernetes.io/created-by":"memcached-operator2","app.kubernetes.io/instance":"controller-manager","app.kubernetes.io/managed-by":"kustomize","app.kubernetes.io/name":"deployment","app.kubernetes.io/part-of":"memcached-operator2","control-plane":"controller-manager"},"name":"memcached-operator2-controller-manager","namespace":"memcached-operator2-system"},"spec":{"replicas":1,"selector":{"matchLabels":{"control-plane":"controller-manager"}},"template":{"metadata":{"annotations":{"kubectl.kubernetes.io/default-container":"manager"},"labels":{"control-plane":"controller-manager"}},"spec":{"affinity":{"nodeAffinity":{"requiredDuringSchedulingIgnoredDuringExecution":{"nodeSelectorTerms":[{"matchExpressions":[{"key":"kubernetes.io/arch","operator":"In","values":["amd64","arm64","ppc64le","s390x"]},{"key":"kubernetes.io/os","operator":"In","values":["linux"]}]}]}}},"containers":[{"args":["--secure-listen-address=0.0.0.0:8443","--upstream=http://127.0.0.1:8080/","--logtostderr=true","--v=0"],"image":"gcr.io/kubebuilder/kube-rbac-proxy:v0.13.0","name":"kube-rbac-proxy","ports":[{"containerPort":8443,"name":"https","protocol":"TCP"}],"resources":{"limits":{"cpu":"500m","memory":"128Mi"},"requests":{"cpu":"5m","memory":"64Mi"}},"securityContext":{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]}}},{"args":["--health-probe-bind-address=:8081","--metrics-bind-address=127.0.0.1:8080","--leader-elect"],"command":["/manager"],"image":"gcr.io/elastic-security-dev/patrickmamaid/memcache/memcached-operator2:v0.0.7","livenessProbe":{"httpGet":{"path":"/healthz","port":8081},"initialDelaySeconds":15,"periodSeconds":20},"name":"manager","readinessProbe":{"httpGet":{"path":"/readyz","port":8081},"initialDelaySeconds":5,"periodSeconds":10},"resources":{"limits":{"cpu":"500m","memory":"128Mi"},"requests":{"cpu":"10m","memory":"64Mi"}},"securityContext":{"allowPrivilegeEscalation":true,"capabilities":{"drop":["ALL"]}}}],"securityContext":{"runAsNonRoot":false},"serviceAccountName":"memcached-operator2-controller-manager","terminationGracePeriodSeconds":10}}}}\n',
              },
              managedFields: [
                {
                  manager: 'kubectl-client-side-apply',
                  operation: 'Update',
                  apiVersion: 'apps/v1',
                  time: '2022-11-07T18:53:28Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:annotations': {
                        '.': {},
                        'f:kubectl.kubernetes.io/last-applied-configuration': {},
                      },
                      'f:labels': {
                        '.': {},
                        'f:app.kubernetes.io/component': {},
                        'f:app.kubernetes.io/created-by': {},
                        'f:app.kubernetes.io/instance': {},
                        'f:app.kubernetes.io/managed-by': {},
                        'f:app.kubernetes.io/name': {},
                        'f:app.kubernetes.io/part-of': {},
                        'f:control-plane': {},
                      },
                    },
                    'f:spec': {
                      'f:progressDeadlineSeconds': {},
                      'f:replicas': {},
                      'f:revisionHistoryLimit': {},
                      'f:selector': {},
                      'f:strategy': {
                        'f:rollingUpdate': {
                          '.': {},
                          'f:maxSurge': {},
                          'f:maxUnavailable': {},
                        },
                        'f:type': {},
                      },
                      'f:template': {
                        'f:metadata': {
                          'f:annotations': {
                            '.': {},
                            'f:kubectl.kubernetes.io/default-container': {},
                          },
                          'f:labels': {
                            '.': {},
                            'f:control-plane': {},
                          },
                        },
                        'f:spec': {
                          'f:affinity': {
                            '.': {},
                            'f:nodeAffinity': {
                              '.': {},
                              'f:requiredDuringSchedulingIgnoredDuringExecution': {},
                            },
                          },
                          'f:containers': {
                            'k:{"name":"kube-rbac-proxy"}': {
                              '.': {},
                              'f:args': {},
                              'f:image': {},
                              'f:imagePullPolicy': {},
                              'f:name': {},
                              'f:ports': {
                                '.': {},
                                'k:{"containerPort":8443,"protocol":"TCP"}': {
                                  '.': {},
                                  'f:containerPort': {},
                                  'f:name': {},
                                  'f:protocol': {},
                                },
                              },
                              'f:resources': {
                                '.': {},
                                'f:limits': {
                                  '.': {},
                                  'f:cpu': {},
                                  'f:memory': {},
                                },
                                'f:requests': {
                                  '.': {},
                                  'f:cpu': {},
                                  'f:memory': {},
                                },
                              },
                              'f:securityContext': {
                                '.': {},
                                'f:allowPrivilegeEscalation': {},
                                'f:capabilities': {
                                  '.': {},
                                  'f:drop': {},
                                },
                              },
                              'f:terminationMessagePath': {},
                              'f:terminationMessagePolicy': {},
                            },
                            'k:{"name":"manager"}': {
                              '.': {},
                              'f:args': {},
                              'f:command': {},
                              'f:image': {},
                              'f:imagePullPolicy': {},
                              'f:livenessProbe': {
                                '.': {},
                                'f:failureThreshold': {},
                                'f:httpGet': {
                                  '.': {},
                                  'f:path': {},
                                  'f:port': {},
                                  'f:scheme': {},
                                },
                                'f:initialDelaySeconds': {},
                                'f:periodSeconds': {},
                                'f:successThreshold': {},
                                'f:timeoutSeconds': {},
                              },
                              'f:name': {},
                              'f:readinessProbe': {
                                '.': {},
                                'f:failureThreshold': {},
                                'f:httpGet': {
                                  '.': {},
                                  'f:path': {},
                                  'f:port': {},
                                  'f:scheme': {},
                                },
                                'f:initialDelaySeconds': {},
                                'f:periodSeconds': {},
                                'f:successThreshold': {},
                                'f:timeoutSeconds': {},
                              },
                              'f:resources': {
                                '.': {},
                                'f:limits': {
                                  '.': {},
                                  'f:cpu': {},
                                  'f:memory': {},
                                },
                                'f:requests': {
                                  '.': {},
                                  'f:cpu': {},
                                  'f:memory': {},
                                },
                              },
                              'f:securityContext': {
                                '.': {},
                                'f:allowPrivilegeEscalation': {},
                                'f:capabilities': {
                                  '.': {},
                                  'f:drop': {},
                                },
                              },
                              'f:terminationMessagePath': {},
                              'f:terminationMessagePolicy': {},
                            },
                          },
                          'f:dnsPolicy': {},
                          'f:restartPolicy': {},
                          'f:schedulerName': {},
                          'f:securityContext': {
                            '.': {},
                            'f:runAsNonRoot': {},
                          },
                          'f:serviceAccount': {},
                          'f:serviceAccountName': {},
                          'f:terminationGracePeriodSeconds': {},
                        },
                      },
                    },
                  },
                },
                {
                  manager: 'kube-controller-manager',
                  operation: 'Update',
                  apiVersion: 'apps/v1',
                  time: '2022-11-09T13:44:11Z',
                  fieldsType: 'FieldsV1',
                  fieldsV1: {
                    'f:metadata': {
                      'f:annotations': {
                        'f:deployment.kubernetes.io/revision': {},
                      },
                    },
                    'f:status': {
                      'f:availableReplicas': {},
                      'f:conditions': {
                        '.': {},
                        'k:{"type":"Available"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                        'k:{"type":"Progressing"}': {
                          '.': {},
                          'f:lastTransitionTime': {},
                          'f:lastUpdateTime': {},
                          'f:message': {},
                          'f:reason': {},
                          'f:status': {},
                          'f:type': {},
                        },
                      },
                      'f:observedGeneration': {},
                      'f:readyReplicas': {},
                      'f:replicas': {},
                      'f:updatedReplicas': {},
                    },
                  },
                  subresource: 'status',
                },
              ],
            },
            spec: {
              replicas: 1,
              selector: {
                matchLabels: {
                  'control-plane': 'controller-manager',
                },
              },
              template: {
                metadata: {
                  creationTimestamp: null,
                  labels: {
                    'control-plane': 'controller-manager',
                  },
                  annotations: {
                    'kubectl.kubernetes.io/default-container': 'manager',
                  },
                },
                spec: {
                  containers: [
                    {
                      name: 'kube-rbac-proxy',
                      image: 'gcr.io/kubebuilder/kube-rbac-proxy:v0.13.0',
                      args: [
                        '--secure-listen-address=0.0.0.0:8443',
                        '--upstream=http://127.0.0.1:8080/',
                        '--logtostderr=true',
                        '--v=0',
                      ],
                      ports: [
                        {
                          name: 'https',
                          containerPort: 8443,
                          protocol: 'TCP',
                        },
                      ],
                      resources: {
                        limits: {
                          cpu: '500m',
                          memory: '128Mi',
                        },
                        requests: {
                          cpu: '5m',
                          memory: '64Mi',
                        },
                      },
                      terminationMessagePath: '/dev/termination-log',
                      terminationMessagePolicy: 'File',
                      imagePullPolicy: 'IfNotPresent',
                      securityContext: {
                        capabilities: {
                          drop: ['ALL'],
                        },
                        allowPrivilegeEscalation: false,
                      },
                    },
                    {
                      name: 'manager',
                      image:
                        'gcr.io/elastic-security-dev/patrickmamaid/memcache/memcached-operator2:v0.0.7',
                      command: ['/manager'],
                      args: [
                        '--health-probe-bind-address=:8081',
                        '--metrics-bind-address=127.0.0.1:8080',
                        '--leader-elect',
                      ],
                      resources: {
                        limits: {
                          cpu: '500m',
                          memory: '128Mi',
                        },
                        requests: {
                          cpu: '10m',
                          memory: '64Mi',
                        },
                      },
                      livenessProbe: {
                        httpGet: {
                          path: '/healthz',
                          port: 8081,
                          scheme: 'HTTP',
                        },
                        initialDelaySeconds: 15,
                        timeoutSeconds: 1,
                        periodSeconds: 20,
                        successThreshold: 1,
                        failureThreshold: 3,
                      },
                      readinessProbe: {
                        httpGet: {
                          path: '/readyz',
                          port: 8081,
                          scheme: 'HTTP',
                        },
                        initialDelaySeconds: 5,
                        timeoutSeconds: 1,
                        periodSeconds: 10,
                        successThreshold: 1,
                        failureThreshold: 3,
                      },
                      terminationMessagePath: '/dev/termination-log',
                      terminationMessagePolicy: 'File',
                      imagePullPolicy: 'IfNotPresent',
                      securityContext: {
                        capabilities: {
                          drop: ['ALL'],
                        },
                        allowPrivilegeEscalation: true,
                      },
                    },
                  ],
                  restartPolicy: 'Always',
                  terminationGracePeriodSeconds: 10,
                  dnsPolicy: 'ClusterFirst',
                  serviceAccountName: 'memcached-operator2-controller-manager',
                  serviceAccount: 'memcached-operator2-controller-manager',
                  securityContext: {
                    runAsNonRoot: false,
                  },
                  affinity: {
                    nodeAffinity: {
                      requiredDuringSchedulingIgnoredDuringExecution: {
                        nodeSelectorTerms: [
                          {
                            matchExpressions: [
                              {
                                key: 'kubernetes.io/arch',
                                operator: 'In',
                                values: ['amd64', 'arm64', 'ppc64le', 's390x'],
                              },
                              {
                                key: 'kubernetes.io/os',
                                operator: 'In',
                                values: ['linux'],
                              },
                            ],
                          },
                        ],
                      },
                    },
                  },
                  schedulerName: 'default-scheduler',
                },
              },
              strategy: {
                type: 'RollingUpdate',
                rollingUpdate: {
                  maxUnavailable: '25%',
                  maxSurge: '25%',
                },
              },
              revisionHistoryLimit: 10,
              progressDeadlineSeconds: 600,
            },
            status: {
              observedGeneration: 1,
              replicas: 1,
              updatedReplicas: 1,
              readyReplicas: 1,
              availableReplicas: 1,
              conditions: [
                {
                  type: 'Progressing',
                  status: 'True',
                  lastUpdateTime: '2022-11-07T18:53:41Z',
                  lastTransitionTime: '2022-11-07T18:53:28Z',
                  reason: 'NewReplicaSetAvailable',
                  message:
                    'ReplicaSet "memcached-operator2-controller-manager-58f8f47cc7" has successfully progressed.',
                },
                {
                  type: 'Available',
                  status: 'True',
                  lastUpdateTime: '2022-11-09T13:44:11Z',
                  lastTransitionTime: '2022-11-09T13:44:11Z',
                  reason: 'MinimumReplicasAvailable',
                  message: 'Deployment has minimum availability.',
                },
              ],
            },
          },
        ],
      };
    }
    // }

    return output;
  }

  randomResponseActionProcesses(n?: number): ProcessesEntry[] {
    const numberOfEntries = n ?? this.randomChoice([20, 30, 40, 50]);
    const entries = [];
    for (let i = 0; i < numberOfEntries; i++) {
      entries.push({
        command: this.randomResponseActionProcessesCommand(),
        pid: this.randomN(1000).toString(),
        entity_id: this.randomString(50),
        user: this.randomUser(),
      });
    }

    return entries;
  }

  protected randomResponseActionProcessesCommand() {
    const commands = [
      '/opt/cmd1',
      '/opt/cmd2',
      '/opt/cmd3/opt/cmd3/opt/cmd3/opt/cmd3/opt/cmd3/opt/cmd3/opt/cmd3/opt/cmd3',
      '/opt/cmd3/opt/cmd3/opt/cmd3/opt/cmd3',
    ];

    return this.randomChoice(commands);
  }

  protected randomResponseActionCommand() {
    return this.randomChoice(RESPONSE_ACTION_API_COMMANDS_NAMES);
  }
}
