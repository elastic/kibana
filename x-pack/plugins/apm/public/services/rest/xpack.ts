/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StringMap } from '../../../typings/common';
import { callApi } from './callApi';

export interface LicenseApiResponse {
  license: {
    expiry_date_in_millis: number;
    is_active: boolean;
    type: string;
  };
  features: {
    beats_management: StringMap;
    graph: StringMap;
    grokdebugger: StringMap;
    index_management: StringMap;
    logstash: StringMap;
    ml: {
      is_available: boolean;
      license_type: number;
      has_expired: boolean;
      enable_links: boolean;
      show_links: boolean;
    };
    reporting: StringMap;
    rollup: StringMap;
    searchprofiler: StringMap;
    security: StringMap;
    spaces: StringMap;
    tilemap: StringMap;
    watcher: {
      is_available: boolean;
      enable_links: boolean;
      show_links: boolean;
    };
  };
}

export async function loadLicense() {
  return callApi<LicenseApiResponse>({
    pathname: `/api/xpack/v1/info`
  });
}
