/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { prefixIndexPattern } from '../ccs_utils';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  INDEX_PATTERN_KIBANA,
  INDEX_PATTERN_LOGSTASH,
  INDEX_PATTERN_BEATS,
  INDEX_ALERTS
} from '../../../common/constants';

export function getIndexPatterns(server, additionalPatterns = {}) {
  // wildcard means to search _all_ clusters
  const ccs = '*';
  const config = server.config();
  const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);
  const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, ccs);
  const lsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_LOGSTASH, ccs);
  const beatsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_BEATS, ccs);
  const apmIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_BEATS, ccs);
  const alertsIndex = prefixIndexPattern(config, INDEX_ALERTS, ccs);
  const indexPatterns = {
    esIndexPattern,
    kbnIndexPattern,
    lsIndexPattern,
    beatsIndexPattern,
    apmIndexPattern,
    alertsIndex,
    ...Object.keys(additionalPatterns).reduce((accum, varName) => {
      return {
        ...accum,
        [varName]: prefixIndexPattern(config, additionalPatterns[varName], ccs),
      };
    }, {})
  };

  return indexPatterns;
}
