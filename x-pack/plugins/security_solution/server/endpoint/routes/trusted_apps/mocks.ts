/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { PackagePolicy } from '../../../../../fleet/common';

import {
  ConditionEntryField,
  OperatingSystem,
  TrustedApp,
} from '../../../../common/endpoint/types';
import { createConditionEntry } from './mapping';

export const getTrustedAppByPolicy = function (): TrustedApp {
  return {
    id: '123',
    version: 'abc123',
    created_at: '11/11/2011T11:11:11.111',
    created_by: 'admin',
    updated_at: '11/11/2011T11:11:11.111',
    updated_by: 'admin',
    name: 'linux trusted app 1',
    description: 'Linux trusted app 1',
    os: OperatingSystem.LINUX,
    effectScope: {
      type: 'policy',
      policies: ['e5cbb9cf-98aa-4303-a04b-6a1165915079', '9da95be9-9bee-4761-a8c4-28d6d9bd8c71'],
    },
    entries: [
      createConditionEntry(ConditionEntryField.HASH, 'match', '1234234659af249ddf3e40864e9fb241'),
      createConditionEntry(ConditionEntryField.PATH, 'match', '/bin/malware'),
    ],
  };
};

export const getPutTrustedAppByPolicyMock = function (): ExceptionListItemSchema {
  return {
    id: '123',
    _version: '1',
    comments: [],
    namespace_type: 'agnostic',
    created_at: '11/11/2011T11:11:11.111',
    created_by: 'admin',
    updated_at: '11/11/2011T11:11:11.111',
    updated_by: 'admin',
    name: 'linux trusted app 1',
    description: 'Linux trusted app 1',
    os_types: [OperatingSystem.LINUX],
    tags: ['policy:9da95be9-9bee-4761-a8c4-28d6d9bd8c71'],
    entries: [
      createConditionEntry(ConditionEntryField.HASH, 'match', '1234234659af249ddf3e40864e9fb241'),
      createConditionEntry(ConditionEntryField.PATH, 'match', '/bin/malware'),
    ],
    item_id: '1',
    list_id: '1',
    meta: undefined,
    tie_breaker_id: '1',
    type: 'simple',
  };
};

export const getPackagePoliciesResponse = function (): PackagePolicy[] {
  return [
    // Next line is ts-ignored as this is the response when the policy doesn't exists but the type is complaining about it.
    // @ts-ignore
    { id: '9da95be9-9bee-4761-a8c4-28d6d9bd8c71', version: undefined },
    {
      id: 'e5cbb9cf-98aa-4303-a04b-6a1165915079',
      version: 'Wzc0NDk5LDFd',
      name: 'EI 2',
      description: '',
      namespace: 'default',
      policy_id: '9fd2ac50-e86f-11eb-a87f-51e16104076a',
      enabled: true,
      output_id: '',
      inputs: [],
      package: { name: 'endpoint', title: 'Endpoint Security', version: '0.20.1' },
      revision: 3,
      created_at: '2021-07-19T09:00:45.608Z',
      created_by: 'elastic',
      updated_at: '2021-07-19T09:02:47.193Z',
      updated_by: 'system',
    },
  ];
};
