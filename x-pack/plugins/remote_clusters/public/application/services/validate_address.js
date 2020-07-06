/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function isAddressValid(seedNode) {
  if (!seedNode) {
    return false;
  }

  const portParts = seedNode.split(':');
  const parts = portParts[0].split('.');
  const containsInvalidCharacters = parts.some((part) => {
    if (!part) {
      // no need to wait for regEx if the part is empty
      return true;
    }
    const [match] = part.match(/[A-Za-z0-9\-]*/);
    return match !== part;
  });

  return !containsInvalidCharacters;
}

export function isPortValid(seedNode) {
  if (!seedNode) {
    return false;
  }

  const parts = seedNode.split(':');
  const hasOnePort = parts.length === 2;

  if (!hasOnePort) {
    return false;
  }

  const port = parts[1];

  if (!port) {
    return false;
  }

  const isPortNumeric = port.match(/[0-9]*/)[0] === port;
  return isPortNumeric;
}
