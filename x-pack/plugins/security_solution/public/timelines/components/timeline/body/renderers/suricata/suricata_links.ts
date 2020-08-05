/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash/fp';
import { db } from 'suricata-sid-db';

export const getLinksFromSignature = (id: number): string[] => {
  const refs = db[id];
  if (refs != null) {
    return uniq(refs);
  } else {
    return [];
  }
};

const specialTokenRules = ['IPv4', 'IPv6'];

export const getBeginningTokens = (signature: string): string[] => {
  const signatureSplit = signature.trim().split(' ');
  return signatureSplit.reduce<string[]>((accum, curr, index) => {
    if (
      (accum.length === index && curr === curr.toUpperCase() && curr !== '') ||
      specialTokenRules.includes(curr)
    ) {
      return [...accum, curr];
    }
    return accum;
  }, []);
};
