/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import versionCompare from 'compare-versions';
import valid from 'semver/functions/valid';
import ipaddr from 'ipaddr.js';
import type { IPv4, IPv6 } from 'ipaddr.js';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';

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

function getVersionCriteria(sortBy: string, directionFactor: number) {
  return (rowA: Record<string, unknown>, rowB: Record<string, unknown>) => {
    const valueA = String(rowA[sortBy] ?? '');
    const valueB = String(rowB[sortBy] ?? '');
    const aInvalid = !valueA || !valid(valueA);
    const bInvalid = !valueB || !valid(valueB);
    if (aInvalid && bInvalid) {
      return 0;
    }
    if (aInvalid) {
      return 1;
    }
    if (bInvalid) {
      return -1;
    }
    return directionFactor * versionCompare(valueA, valueB);
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

type CompareFn = (rowA: Record<string, unknown>, rowB: Record<string, unknown>) => number;

export function getSortingCriteria(
  type: string | undefined,
  sortBy: string,
  formatter: FieldFormat,
  direction: string
) {
  // handle the direction with a multiply factor.
  const directionFactor = direction === 'asc' ? 1 : -1;

  let criteria: CompareFn;

  if (['number', 'date'].includes(type || '')) {
    criteria = (rowA: Record<string, unknown>, rowB: Record<string, unknown>) =>
      directionFactor * ((rowA[sortBy] as number) - (rowB[sortBy] as number));
  }
  // this is a custom type, and can safely assume the gte and lt fields are all numbers or undefined
  else if (type === 'range') {
    criteria = getRangeCriteria(sortBy, directionFactor);
  }
  // IP have a special sorting
  else if (type === 'ip') {
    criteria = getIPCriteria(sortBy, directionFactor);
  } else if (type === 'version') {
    // do not wrap in undefined behandler because of special invalid-case handling
    return getVersionCriteria(sortBy, directionFactor);
  } else {
    // use a string sorter for the rest
    criteria = (rowA: Record<string, unknown>, rowB: Record<string, unknown>) => {
      const aString = formatter.convert(rowA[sortBy]);
      const bString = formatter.convert(rowB[sortBy]);
      return directionFactor * aString.localeCompare(bString);
    };
  }
  return getUndefinedHandler(sortBy, criteria);
}

function getUndefinedHandler(
  sortBy: string,
  sortingCriteria: (rowA: Record<string, unknown>, rowB: Record<string, unknown>) => number
) {
  return (rowA: Record<string, unknown>, rowB: Record<string, unknown>) => {
    const valueA = rowA[sortBy];
    const valueB = rowB[sortBy];
    if (valueA != null && valueB != null && !Number.isNaN(valueA) && !Number.isNaN(valueB)) {
      return sortingCriteria(rowA, rowB);
    }
    if (valueA == null || Number.isNaN(valueA)) {
      return 1;
    }
    if (valueB == null || Number.isNaN(valueB)) {
      return -1;
    }

    return 0;
  };
}
