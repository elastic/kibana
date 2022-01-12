/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegacyServer } from '../../types';
import { prefixIndexPattern } from '../../../common/ccs_utils';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  INDEX_PATTERN_KIBANA,
  INDEX_PATTERN_LOGSTASH,
  INDEX_PATTERN_BEATS,
  INDEX_ALERTS,
  INDEX_PATTERN_ENTERPRISE_SEARCH,
} from '../../../common/constants';

export function getIndexPatterns(
  server: LegacyServer,
  additionalPatterns: Record<string, string> = {},
  ccs: string = '*'
) {
  const config = server.config();
  const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);
  const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, ccs);
  const lsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_LOGSTASH, ccs);
  const beatsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_BEATS, ccs);
  const apmIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_BEATS, ccs);
  const alertsIndex = prefixIndexPattern(config, INDEX_ALERTS, ccs);
  const enterpriseSearchIndexPattern = prefixIndexPattern(
    config,
    INDEX_PATTERN_ENTERPRISE_SEARCH,
    ccs
  );
  const indexPatterns = {
    esIndexPattern,
    kbnIndexPattern,
    lsIndexPattern,
    beatsIndexPattern,
    apmIndexPattern,
    alertsIndex,
    enterpriseSearchIndexPattern,
    ...Object.keys(additionalPatterns).reduce((accum, varName) => {
      return {
        ...accum,
        [varName]: prefixIndexPattern(config, additionalPatterns[varName], ccs, true),
      };
    }, {}),
  };

  return indexPatterns;
}
