/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ADDITION_PREFIX = '$$$';
export const REMOVAL_PREFIX = '^^^';
const escapePrefix = prefix =>
  prefix
    .split('')
    .map(i => `\\${i}`)
    .join('');
const removePrefixRegex = new RegExp(
  `(${escapePrefix(ADDITION_PREFIX)})|(${escapePrefix(REMOVAL_PREFIX)})`,
  'g'
);

export const isBoolean = value =>
  JSON.parse(value) === true || JSON.parse(value) === false;
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

export const removePrefixes = obj => {
  if (typeof obj === 'string') {
    return obj.replace(removePrefixRegex, '');
  }

  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  return Object.keys(obj).reduce(
    (newObj, key) => ({
      ...newObj,
      [key.replace(removePrefixRegex, '')]: obj[key] && typeof obj[key] === 'object' ?
        removePrefixes(obj[key]) :
        obj[key],
    }), {}
  );
};

const normalizeChange = (key, value) => {
  if (typeof value === 'string') {
    return {
      key: removePrefixes(key),
      value: removePrefixes(value)
    };
  }
  return Object.entries(value).reduce((accum, [key, value]) => {
    if (typeof value === 'string') {
      return {
        key: removePrefixes(key),
        value: removePrefixes(value)
      };
    }
    return normalizeChange(key, value);
  }, {});
};

export const mergeAndPreserveDuplicateKeys = (
  source,
  target,
  result = {},
  changes = []
) => {
  for (const [key, value] of Object.entries(source)) {
    // const debug = key === 'fooobar';
    // debug && console.log('mergeAndPreserveDuplicateKeys', key, value, target);
    if (isDifferent(target, key, value)) {
      // debug && console.log('isDifferent');
      result[`${REMOVAL_PREFIX}${key}`] = value;
      result[`${ADDITION_PREFIX}${key}`] = target[key];
      changes.push({
        key,
        original: removePrefixes(value),
        updated: removePrefixes(target[key]),
      });
    } else if (isObject(value)) {
      // debug && console.log('value is object', target[key]);
      if (target.hasOwnProperty(key)) {
        const recurseResult = mergeAndPreserveDuplicateKeys(value, target[key]);
        result[key] = recurseResult.result;
        changes.push(...recurseResult.changes);
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

    const normalized = normalizeChange(key, result[`${ADDITION_PREFIX}${key}`]);
    changes.push({
      key: normalized.key,
      updated: normalized.value,
    });
  }
  return {
    result,
    changes
  };
};
