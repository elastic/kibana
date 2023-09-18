/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import versionCompare from 'compare-versions';
import valid from 'semver/functions/valid';
import ipaddr, { type IPv4, type IPv6 } from 'ipaddr.js';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

type CompareFn<T extends unknown> = (
  v1: T | undefined,
  v2: T | undefined,
  direction: number,
  formatter: FieldFormat
) => number;

const numberCompare: CompareFn<number> = (v1, v2) => (v1 ?? -Infinity) - (v2 ?? -Infinity);

const stringComparison: CompareFn<string> = (v1, v2, _, formatter) => {
  const aString = formatter.convert(v1);
  const bString = formatter.convert(v2);
  if (v1 == null) {
    return -1;
  }
  if (v2 == null) {
    return 1;
  }
  return aString.localeCompare(bString);
};

// The maximum length of a IP is 39 chars for a IPv6
// therefore set 40 for null values to always be longer
const MAX_IP_LENGTH = 40;

const ipComparison: CompareFn<string> = (v1, v2, direction) => {
  const ipA = getSafeIpAddress(v1, direction);
  const ipB = getSafeIpAddress(v2, direction);

  // Now compare each part of the IPv6 address and exit when a value != 0 is found
  let i = 0;
  let diff = ipA.parts[i] - ipB.parts[i];
  while (!diff && i < 7) {
    i++;
    diff = ipA.parts[i] - ipB.parts[i];
  }

  // in case of same address but written in different styles, sort by string length
  if (diff === 0) {
    const v1Length = v1 ? v1.length : MAX_IP_LENGTH;
    const v2Length = v2 ? v2.length : MAX_IP_LENGTH;
    return v1Length - v2Length;
  }
  return diff;
};

/**
 * This is a comparison utility for array
 * It performs a comparison for each pair of value and exists on the first comparison value != 0
 * @param array1 T[]
 * @param array2 T[]
 * @param directionFactor +1 / -1
 * @param compareFn
 * @returns
 */
function compareArrays<T extends unknown>(
  array1: T[],
  array2: T[],
  directionFactor: number,
  formatter: FieldFormat,
  compareFn: CompareFn<T>
): number {
  // sort by each pair of values
  const maxLength = Math.max(array1.length, array2.length);
  for (let i = 0; i < maxLength; i++) {
    const comparisonValue = compareFn(array1[i], array2[i], directionFactor, formatter);
    if (comparisonValue !== 0) {
      return comparisonValue;
    }
  }
  return 0;
}

function isIPv6Address(ip: IPv4 | IPv6): ip is IPv6 {
  return ip.kind() === 'ipv6';
}

function getSafeIpAddress(ip: string | undefined, directionFactor: number) {
  if (ip == null || !ipaddr.isValid(ip)) {
    // if ip is null, then it's a part of an array ip value
    // therefore the comparison might be between a single value [ipA, undefined] vs multiple values ip [ipA, ipB]
    // set in this case -1 for the undefined of the former to force it to be always before
    const forceSortingFactor = ip == null ? -1 : directionFactor;
    // for non valid IPs have the same behaviour as for now (we assume it's only the "Other" string)
    // create a mock object which has all a special value to keep them always at the bottom of the list
    return { parts: Array(8).fill(forceSortingFactor * Infinity) };
  }
  const parsedIp = ipaddr.parse(ip);
  return isIPv6Address(parsedIp) ? parsedIp : parsedIp.toIPv4MappedAddress();
}

const versionComparison: CompareFn<string> = (v1, v2, direction) => {
  const valueA = String(v1 ?? '');
  const valueB = String(v2 ?? '');
  const aInvalid = !valueA || !valid(valueA);
  const bInvalid = !valueB || !valid(valueB);
  if (aInvalid && bInvalid) {
    return 0;
  }
  // need to fight the direction multiplication of the parent function
  if (aInvalid) {
    return direction * 1;
  }
  if (bInvalid) {
    return direction * -1;
  }
  return versionCompare(valueA, valueB);
};

const openRange = { gte: -Infinity, lt: Infinity };
const rangeComparison: CompareFn<Omit<Range, 'type'>> = (v1, v2) => {
  const rangeA = { ...openRange, ...v1 };
  const rangeB = { ...openRange, ...v2 };

  const fromComparison = rangeA.gte - rangeB.gte;
  const toComparison = rangeA.lt - rangeB.lt;

  return fromComparison || toComparison || 0;
};

function createArrayValuesHandler(sortBy: string, directionFactor: number, formatter: FieldFormat) {
  return function <T>(criteriaFn: CompareFn<T>) {
    return (rowA: Record<string, unknown>, rowB: Record<string, unknown>) => {
      // if either side of the comparison is an array, make it also the other one become one
      // then perform an array comparison
      if (Array.isArray(rowA[sortBy]) || Array.isArray(rowB[sortBy])) {
        return (
          directionFactor *
          compareArrays(
            (Array.isArray(rowA[sortBy]) ? rowA[sortBy] : [rowA[sortBy]]) as T[],
            (Array.isArray(rowB[sortBy]) ? rowB[sortBy] : [rowB[sortBy]]) as T[],
            directionFactor,
            formatter,
            criteriaFn
          )
        );
      }
      return (
        directionFactor *
        criteriaFn(rowA[sortBy] as T, rowB[sortBy] as T, directionFactor, formatter)
      );
    };
  };
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

export function getSortingCriteria(
  type: string | undefined,
  sortBy: string,
  formatter: FieldFormat,
  direction: string
) {
  // handle the direction with a multiply factor.
  const directionFactor = direction === 'asc' ? 1 : -1;

  const arrayValueHandler = createArrayValuesHandler(sortBy, directionFactor, formatter);

  if (['number', 'date'].includes(type || '')) {
    return getUndefinedHandler(sortBy, arrayValueHandler(numberCompare));
  }
  // this is a custom type, and can safely assume the gte and lt fields are all numbers or undefined
  if (type === 'range') {
    return getUndefinedHandler(sortBy, arrayValueHandler(rangeComparison));
  }
  // IP have a special sorting
  if (type === 'ip') {
    return getUndefinedHandler(sortBy, arrayValueHandler(ipComparison));
  }
  if (type === 'version') {
    // do not wrap in undefined handler because of special invalid-case handling
    return arrayValueHandler(versionComparison);
  }
  // use a string sorter for the rest
  return getUndefinedHandler(sortBy, arrayValueHandler(stringComparison));
}
