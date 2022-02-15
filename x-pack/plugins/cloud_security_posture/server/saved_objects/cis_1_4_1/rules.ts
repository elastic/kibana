/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsBulkCreateObject } from 'src/core/server';
import type { CspRuleSchema } from '../../../common/schemas/csp_rule';
import { cspRuleAssetSavedObjectType } from '../../../common/schemas/csp_rule';

const benchmark = { name: 'CIS', version: '1.4.1' } as const;

const RULES: CspRuleSchema[] = [
  {
    id: '1.1.1',
    name: 'Ensure that the API server pod specification file permissions are set to 644 or more restrictive (Automated)',
    description: 'Disable anonymous requests to the API server',
    rationale:
      'When enabled, requests that are not rejected by other configured authentication methods\nare treated as anonymous requests. These requests are then served by the API server. You\nshould rely on authentication to authorize access and disallow anonymous requests.\nIf you are using RBAC authorization, it is generally considered reasonable to allow\nanonymous access to the API Server for health checks and discovery purposes, and hence\nthis recommendation is not scored. However, you should consider whether anonymous\ndiscovery is an acceptable risk for your purposes.',
    impact: 'Anonymous requests will be rejected.',
    default_value: 'By default, anonymous access is enabled.',
    remediation:
      'Edit the API server pod specification file /etc/kubernetes/manifests/kubeapiserver.yaml on the master node and set the below parameter.\n--anonymous-auth=false',
    tags: [],
    enabled: true,
    muted: false,
    benchmark,
  },
  {
    id: '1.1.2',
    name: 'Ensure that the --basic-auth-file argument is not set (Scored)',
    description: 'Do not use basic authentication',
    rationale:
      'Basic authentication uses plaintext credentials for authentication. Currently, the basic\nauthentication credentials last indefinitely, and the password cannot be changed without\nrestarting API server. The basic authentication is currently supported for convenience.\nHence, basic authentication should not be used',
    impact:
      'You will have to configure and use alternate authentication mechanisms such as tokens and\ncertificates. Username and password for basic authentication could no longer be used.',
    default_value: 'By default, basic authentication is not set',
    remediation:
      'Follow the documentation and configure alternate mechanisms for authentication. Then,\nedit the API server pod specification file /etc/kubernetes/manifests/kubeapiserver.yaml on the master node and remove the --basic-auth-file=<filename>\nparameter.',
    tags: [],
    enabled: true,
    muted: false,
    benchmark,
  },
];

export const CIS_BENCHMARK_1_4_1_RULES: Array<SavedObjectsBulkCreateObject<CspRuleSchema>> =
  RULES.map((rule) => ({
    attributes: rule,
    id: rule.id,
    type: cspRuleAssetSavedObjectType,
  }));
