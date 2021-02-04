/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverMajor from 'semver/functions/major';
import { LOGSTASH } from '../../../common/constants';

export function isPipelineMonitoringSupportedInVersion(logstashVersion) {
  const major = semverMajor(logstashVersion);
  return major >= LOGSTASH.MAJOR_VER_REQD_FOR_PIPELINES;
}
