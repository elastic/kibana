/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash/fp';
import { suricataRulesRef } from './suricata_rules_ref';

export const getLinksFromSignature = (id: string): string[] => {
  const refs = suricataRulesRef[id];
  if (refs != null) {
    return uniq(refs);
  } else {
    return [];
  }
};

const specialTokenRules = ['IPv4', 'IPv6'];

export const getBeginningTokens = (signature: string): string[] => {
  const signatureSplit = signature.split(' ');
  return signatureSplit.reduce<string[]>((accum, curr, index) => {
    if (
      (accum.length === index && curr === curr.toUpperCase() && curr !== '') ||
      specialTokenRules.includes(curr)
    ) {
      accum = accum.concat(curr);
    }
    return accum;
  }, []);
};
