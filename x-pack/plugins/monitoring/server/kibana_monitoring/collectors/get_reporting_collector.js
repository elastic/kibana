/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KIBANA_REPORTING_TYPE } from '../../../common/constants';
import { getReportingUsage } from '../../../../reporting';

export function getReportingCollector(server, callCluster) {
  return {
    type: KIBANA_REPORTING_TYPE,
    fetch() {
      return getReportingUsage(callCluster, server);
    }
  };
}
