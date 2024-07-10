/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FINDINGS_INDEX_NAME,
  CDR_FINDINGS_DATA_VIEW_NAME,
  LATEST_FINDINGS_INDEX_TEMPLATE_NAME,
  CDR_LATEST_FINDINGS_INDEX_PATTERN,
  VULNERABILITIES_INDEX_NAME,
  LATEST_VULNERABILITIES_INDEX_PATTERN,
  LATEST_VULNERABILITIES_INDEX_TEMPLATE_NAME,
  LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
} from '../../common/constants';
import { LatestIndexConfig } from './types';

export const latestIndexConfigs: LatestIndexConfig = {
  findings: {
    indexName: FINDINGS_INDEX_NAME,
    indexPattern: CDR_FINDINGS_DATA_VIEW_NAME,
    indexTemplateName: LATEST_FINDINGS_INDEX_TEMPLATE_NAME,
    indexDefaultName: CDR_LATEST_FINDINGS_INDEX_PATTERN,
  },
  vulnerabilities: {
    indexName: VULNERABILITIES_INDEX_NAME,
    indexPattern: LATEST_VULNERABILITIES_INDEX_PATTERN,
    indexTemplateName: LATEST_VULNERABILITIES_INDEX_TEMPLATE_NAME,
    indexDefaultName: LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
  },
};
