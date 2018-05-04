/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ADDITION_PREFIX = '$';
export const REMOVAL_PREFIX = '^';
const removePrefixRegex = new RegExp(
  `(\\${ADDITION_PREFIX}|\\${REMOVAL_PREFIX})`,
  'g'
);

const isObject = value => typeof value === 'object' && !Array.isArray(value);
const isDifferent = (obj, key, value) => {
  // If the object does not contain the key, then ignore since it's not a removal or addition
  if (!obj.hasOwnProperty(key)) {
    return false;
  }

  // If we're dealing with an array, we need something better than a simple === comparison
  if (Array.isArray(value)) {
    return JSON.stringify(value) !== JSON.stringify(obj[key]);
  }

  // If the value is an object, do not try and compare as this is called in a recursive function
  // so safely ignore
  if (typeof value === 'object') {
    return false;
  }

  // We should be dealing with primitives so do a basic comparison
  return obj[key] !== value;
};
const getAdditions = obj => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isObject(value)) {
      result[`${ADDITION_PREFIX}${key}`] = getAdditions(value);
    } else {
      result[`${ADDITION_PREFIX}${key}`] = value;
    }
  }
  return result;
};

export const removePrefixes = str => str.replace(removePrefixRegex, '');

export const mergeAndPreserveDuplicateKeys = (source, target, result = {}) => {
  for (const [key, value] of Object.entries(source)) {
    // const debug = key === 'fooobar';
    // debug && console.log('mergeAndPreserveDuplicateKeys', key, value, target);
    if (isDifferent(target, key, value)) {
      // debug && console.log('isDifferent');
      result[`${REMOVAL_PREFIX}${key}`] = value;
      result[`${ADDITION_PREFIX}${key}`] = target[key];
    } else if (isObject(value)) {
      // debug && console.log('value is object', target[key]);
      if (target.hasOwnProperty(key)) {
        result[key] = mergeAndPreserveDuplicateKeys(value, target[key]);
      } else {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }

  for (const [key, value] of Object.entries(target)) {
    if (
      result.hasOwnProperty(key) ||
      result.hasOwnProperty(`${REMOVAL_PREFIX}${key}`) ||
      result.hasOwnProperty(`${ADDITION_PREFIX}${key}`)
    ) {
      continue;
    }

    if (isObject(value)) {
      result[`${ADDITION_PREFIX}${key}`] = getAdditions(value);
    } else {
      result[`${ADDITION_PREFIX}${key}`] = value;
    }
  }
  return result;
};
