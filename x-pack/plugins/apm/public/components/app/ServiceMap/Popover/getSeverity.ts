/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum severity {
  critical = 'critical',
  major = 'major',
  minor = 'minor',
  warning = 'warning',
}

// TODO: Replace with `getSeverity` from:
// https://github.com/elastic/kibana/blob/0f964f66916480f2de1f4b633e5afafc08cf62a0/x-pack/plugins/ml/common/util/anomaly_utils.ts#L129
export function getSeverity(score?: number) {
  if (typeof score !== 'number') {
    return undefined;
  } else if (score < 25) {
    return severity.warning;
  } else if (score >= 25 && score < 50) {
    return severity.minor;
  } else if (score >= 50 && score < 75) {
    return severity.major;
  } else if (score >= 75) {
    return severity.critical;
  } else {
    return undefined;
  }
}
