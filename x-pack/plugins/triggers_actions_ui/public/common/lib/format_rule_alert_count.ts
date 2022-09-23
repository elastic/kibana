/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverLt from 'semver/functions/lt';

export const formatRuleAlertCount = (value: string, version?: string): string => {
  if (version) {
    try {
      const intValue = parseInt(value, 10);
      if (intValue === 0 && semverLt(version, '8.3.0')) {
        return '--';
      }
    } catch (err) {
      return value;
    }
  }

  return value;
};
