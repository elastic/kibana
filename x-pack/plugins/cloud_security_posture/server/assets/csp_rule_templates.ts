/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsBulkCreateObject } from 'src/core/server';
import {
  CloudSecurityPostureRuleTemplateSchema,
  cloudSecurityPostureRuleTemplateSavedObjectType,
} from '../../common/schemas/csp_rule_template';

const RULE_TEMPLATES: CloudSecurityPostureRuleTemplateSchema[] = [
  {
    benchmark_rule_id: '1.1.1',
    name: 'Ensure that the API server pod specification file permissions are set to 644 or more restrictive (Automated)',
    description: "'Disable anonymous requests to the API server",
    rationale:
      'When enabled, requests that are not rejected by other configured authentication methods\nare treated as anonymous requests. These requests are then served by the API server. You\nshould rely on authentication to authorize access and disallow anonymous requests.\nIf you are using RBAC authorization, it is generally considered reasonable to allow\nanonymous access to the API Server for health checks and discovery purposes, and hence\nthis recommendation is not scored. However, you should consider whether anonymous\ndiscovery is an acceptable risk for your purposes.',
    impact: 'Anonymous requests will be rejected.',
    default_value: 'By default, anonymous access is enabled.',
    remediation:
      'Edit the API server pod specification file /etc/kubernetes/manifests/kubeapiserver.yaml on the master node and set the below parameter.\n--anonymous-auth=false',
    enabled: true,
    muted: false,
    tags: ['Kubernetes', 'Containers'],
    benchmark: { name: 'CIS Kubernetes', version: '1.4.1' },
    severity: 'low',
  },
  {
    benchmark_rule_id: '1.1.12',
    name: 'Ensure that the etcd data directory ownership is set to etcd:etcd',
    description:
      'etcd is a highly-available key-value store used by Kubernetes deployments for persistent storage of all of its REST API objects. This data directory should be protected from any unauthorized reads or writes. It should be owned by etcd:etcd.',
    rationale:
      'When enabled, requests that are not rejected by other configured authentication methods\nare treated as anonymous requests. These requests are then served by the API server. You\nshould rely on authentication to authorize access and disallow anonymous requests.\nIf you are using RBAC authorization, it is generally considered reasonable to allow\nanonymous access to the API Server for health checks and discovery purposes, and hence\nthis recommendation is not scored. However, you should consider whether anonymous\ndiscovery is an acceptable risk for your purposes.',
    impact: 'None',
    default_value: 'By default, anonymous access is enabled.',
    remediation:
      'Edit the API server pod specification file /etc/kubernetes/manifests/kubeapiserver.yaml on the master node and set the below parameter.\n--anonymous-auth=false',
    enabled: true,
    muted: false,
    tags: ['Kubernetes', 'Containers', 'CIS 1.1.12', 'Master Node Configuration'],
    benchmark: { name: 'CIS Kubernetes', version: '1.4.1' },
    severity: 'low',
  },
];

export const CIS_BENCHMARK_1_4_1_RULE_TEMPLATES: Array<
  SavedObjectsBulkCreateObject<CloudSecurityPostureRuleTemplateSchema>
> = RULE_TEMPLATES.map((rule) => ({
  attributes: rule,
  type: cloudSecurityPostureRuleTemplateSavedObjectType,
}));
