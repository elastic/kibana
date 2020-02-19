/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { padLeft } from 'lodash';
import xPackage from '../../../../package.json';

export function getCurrentVersionAsInteger(): number {
  // break up the string parts
  const splitted = xPackage.version.split('.');

  // pad each part with leading 0 to make 2 characters
  const padded = splitted.map((v: string) => {
    const vMatches = v.match(/\d+/);
    if (vMatches) {
      return padLeft(vMatches[0], 2, '0');
    }
    return '00';
  });
  return parseInt(padded.join(''), 10);
}
