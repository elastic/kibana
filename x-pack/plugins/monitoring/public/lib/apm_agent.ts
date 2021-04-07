/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Legacy } from '../legacy_shims';

/**
 * Possible temporary work arround to establish if APM might also be monitoring fleet:
 * https://github.com/elastic/kibana/pull/95129/files#r604815886
 */
export const checkAgentTypeMetric = (versions?: string[]) => {
  if (!Legacy.shims.isCloud || !versions) {
    return false;
  }
  versions.forEach((version) => {
    const [major, minor] = version.split('.');
    const majorInt = Number(major);
    if (majorInt > 7 || (majorInt === 7 && Number(minor) >= 13)) {
      return true;
    }
  });
  return false;
};
