/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { padStart } from 'lodash';

/*
 * The logic for ID is: XXYYZZAA, where XX is major version, YY is minor
 * version, ZZ is revision, and AA is alpha/beta/rc indicator.
 *
 * AA values below 25 are for alpha builder (since 5.0), and above 25 and below
 * 50 are beta builds, and below 99 are RC builds, with 99 indicating a release
 * the (internal) format of the id is there so we can easily do after/before
 * checks on the id
 *
 * Note: the conversion method is carried over from Elasticsearch:
 * https://github.com/elastic/elasticsearch/blob/de962b2/server/src/main/java/org/elasticsearch/Version.java
 */
export function getTemplateVersion(versionStr: string): number {
  // break up the string parts
  const splitted = versionStr.split('.');
  const minorStr = splitted[2] || '';

  // pad each part with leading 0 to make 2 characters
  const padded = splitted.map((v: string) => {
    const vMatches = v.match(/\d+/);
    if (vMatches) {
      return padStart(vMatches[0], 2, '0');
    }
    return '00';
  });
  const [majorV, minorV, patchV] = padded;

  // append the alpha/beta/rc indicator
  let buildV;
  if (minorStr.match('alpha')) {
    const matches = minorStr.match(/alpha(?<alpha>\d+)/);
    if (matches != null && matches.groups != null) {
      const alphaVerInt = parseInt(matches.groups.alpha, 10); // alpha build indicator
      buildV = padStart(`${alphaVerInt}`, 2, '0');
    }
  } else if (minorStr.match('beta')) {
    const matches = minorStr.match(/beta(?<beta>\d+)/);
    if (matches != null && matches.groups != null) {
      const alphaVerInt = parseInt(matches.groups.beta, 10) + 25; // beta build indicator
      buildV = padStart(`${alphaVerInt}`, 2, '0');
    }
  } else {
    buildV = '99'; // release build indicator
  }

  const joinedParts = [majorV, minorV, patchV, buildV].join('');
  return parseInt(joinedParts, 10);
}
