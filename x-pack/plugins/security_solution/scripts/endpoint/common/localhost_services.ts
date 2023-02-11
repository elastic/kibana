/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reduce, filter } from 'lodash';
import os from 'node:os';

const POSSIBLE_LOCALHOST_VALUES: readonly string[] = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '0000:0000:0000:0000:0000:0000:0000:0000',
];

export const getLocalhostRealIp = (): string => {
  const interfaces = reduce(
    os.networkInterfaces(),
    (acc, value) => {
      acc.push(...filter(value, { family: 'IPv4', internal: false }));
      return acc;
    },
    [] as os.NetworkInterfaceInfo[]
  );

  return interfaces?.[0]?.address ?? '0.0.0.0';
};

export const isLocalhost = (hostname: string): boolean => {
  return POSSIBLE_LOCALHOST_VALUES.includes(hostname.toLowerCase());
};
