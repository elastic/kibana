/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Legacy } from '../legacy_shims';

/**
 * Checks if on cloud and >= 7.13
 * In this configuration APM server should be running within elastic agent.
 * See https://github.com/elastic/kibana/issues/97879 for details.
 */
export const checkAgentTypeMetric = (versions?: string[]) => {
  if (!Legacy.shims.isCloud || !versions) {
    return false;
  }
  let criteriaPassed = false;
  versions.forEach((version) => {
    const [major, minor] = version.split('.');
    const majorInt = Number(major);
    if (majorInt > 7 || (majorInt === 7 && Number(minor) >= 13)) {
      criteriaPassed = true;
      return;
    }
  });
  return criteriaPassed;
};
