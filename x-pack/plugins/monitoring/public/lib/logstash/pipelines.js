/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import semver from 'semver';
import { LOGSTASH } from '../../../common/constants';

export function isPipelineMonitoringSupportedInVersion(logstashVersion) {
  const major = semver.major(logstashVersion);
  return major >= LOGSTASH.MAJOR_VER_REQD_FOR_PIPELINES;
}
