/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash/fp';

const lazySuricataLibConfiguration = (): Promise<{ db: Record<string, string[]> }> => {
  /**
   * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
   * See https://webpack.js.org/api/module-methods/#magic-comments
   */
  return import(
    /* webpackChunkName: "lazy_suricata_lib_configuration" */
    'suricata-sid-db'
  );
};

export const getLinksFromSignature = async (id: number): Promise<string[]> => {
  const db = (await lazySuricataLibConfiguration()).db;
  const refs = Object.hasOwn(db, id) ? db[id] : null;
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
