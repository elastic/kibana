/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValid, IPv4, IPv6 } from 'ipaddr.js';
import type { SearchTypes } from '../../../../../../../common/detection_engine/types';

const isValidIPv4CIDR = (ip: string) => {
  try {
    IPv4.parseCIDR(ip);
    return true;
  } catch (e) {
    return false;
  }
};

const isValidIPv6CIDR = (ip: string) => {
  try {
    IPv6.parseCIDR(ip);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * validates ES ip type
 */
export const isValidIpType = (ip: SearchTypes): boolean => {
  if (typeof ip !== 'string') {
    return false;
  }

  return isValid(ip) || isValidIPv4CIDR(ip) || isValidIPv6CIDR(ip);
};
