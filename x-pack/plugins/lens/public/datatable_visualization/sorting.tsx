/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ipaddr from 'ipaddr.js';
import type { IPv4, IPv6 } from 'ipaddr.js';
import { FieldFormat } from 'src/plugins/data/public';

function isIPv6Address(ip: IPv4 | IPv6): ip is IPv6 {
  return ip.kind() === 'ipv6';
}

function getSafeIpAddress(ip: string, directionFactor: number) {
  if (!ipaddr.isValid(ip)) {
    // for non valid IPs have the same behaviour as for now (we assume it's only the "Other" string)
    // create a mock object which has all a special value to keep them always at the bottom of the list
    return { parts: Array(8).fill(directionFactor * Infinity) };
  }
  const parsedIp = ipaddr.parse(ip);
  return isIPv6Address(parsedIp) ? parsedIp : parsedIp.toIPv4MappedAddress();
}

function getIPCriteria(sortBy: string, directionFactor: number) {
  // Create a set of 8 function to sort based on the 8 IPv6 slots of an address
  // For IPv4 bring them to the IPv6 "mapped" format and then sort
  return (rowA: Record<string, unknown>, rowB: Record<string, unknown>) => {
    const ipAString = rowA[sortBy] as string;
    const ipBString = rowB[sortBy] as string;
    const ipA = getSafeIpAddress(ipAString, directionFactor);
    const ipB = getSafeIpAddress(ipBString, directionFactor);

    // Now compare each part of the IPv6 address and exit when a value != 0 is found
    let i = 0;
    let diff = ipA.parts[i] - ipB.parts[i];
    while (!diff && i < 7) {
      i++;
      diff = ipA.parts[i] - ipB.parts[i];
    }

    // in case of same address but written in different styles, sort by string length
    if (diff === 0) {
      return directionFactor * (ipAString.length - ipBString.length);
    }
    return directionFactor * diff;
  };
}

function getRangeCriteria(sortBy: string, directionFactor: number) {
  // fill missing fields with these open bounds to perform number sorting
  const openRange = { gte: -Infinity, lt: Infinity };
  return (rowA: Record<string, unknown>, rowB: Record<string, unknown>) => {
    const rangeA = { ...openRange, ...(rowA[sortBy] as Omit<Range, 'type'>) };
    const rangeB = { ...openRange, ...(rowB[sortBy] as Omit<Range, 'type'>) };

    const fromComparison = rangeA.gte - rangeB.gte;
    const toComparison = rangeA.lt - rangeB.lt;

    return directionFactor * (fromComparison || toComparison);
  };
}

export function getSortingCriteria(
  type: string | undefined,
  sortBy: string,
  formatter: FieldFormat,
  direction: string
) {
  // handle the direction with a multiply factor.
  const directionFactor = direction === 'asc' ? 1 : -1;

  if (['number', 'date'].includes(type || '')) {
    return (rowA: Record<string, unknown>, rowB: Record<string, unknown>) =>
      directionFactor * ((rowA[sortBy] as number) - (rowB[sortBy] as number));
  }
  // this is a custom type, and can safely assume the gte and lt fields are all numbers or undefined
  if (type === 'range') {
    return getRangeCriteria(sortBy, directionFactor);
  }
  // IP have a special sorting
  if (type === 'ip') {
    return getIPCriteria(sortBy, directionFactor);
  }
  // use a string sorter for the rest
  return (rowA: Record<string, unknown>, rowB: Record<string, unknown>) => {
    const aString = formatter.convert(rowA[sortBy]);
    const bString = formatter.convert(rowB[sortBy]);
    return directionFactor * aString.localeCompare(bString);
  };
}
