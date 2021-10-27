/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID } from '@kbn/securitysolution-list-constants';
import ipaddr from 'ipaddr.js';

export function createEmptyHostIsolationException(): CreateExceptionListItemSchema {
  return {
    comments: [],
    description: '',
    entries: [
      {
        field: 'destination.ip',
        operator: 'included',
        type: 'match',
        value: '',
      },
    ],
    item_id: undefined,
    list_id: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
    name: '',
    namespace_type: 'agnostic',
    os_types: ['windows', 'linux', 'macos'],
    tags: ['policy:all'],
    type: 'simple',
  };
}

/**
 * Validates that an IP is a valid ipv4 or CIDR.
 * The initial regex validates the format for x.x.x.x/xx
 * Then ipaddr is used for a deeper ipv4 validation
 */
export function isValidIPv4OrCIDR(maybeIp: string): boolean {
  const ipv4re = /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;
  if (ipv4re.test(maybeIp)) {
    try {
      ipaddr.IPv4.parseCIDR(maybeIp);
      return true;
    } catch (e) {
      return ipaddr.IPv4.isValid(maybeIp);
    }
  }
  return false;
}
