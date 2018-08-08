/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import { uiModules } from 'ui/modules';
import { addSystemApiHeader } from 'ui/system_api';

const module = uiModules.get('xpack/reporting');

module.service('reportingJobQueue', ($http) => {
  const baseUrl = '../api/reporting/jobs';

  return {
    list(page = 0) {
      const urlObj = {
        pathname: `${baseUrl}/list`,
        query: { page }
      };

      const headers = addSystemApiHeader({});
      return $http.get(url.format(urlObj), { headers })
        .then((res) => res.data);
    },

    total() {
      const urlObj = { pathname: `${baseUrl}/count` };

      const headers = addSystemApiHeader({});
      return $http.get(url.format(urlObj), { headers })
        .then((res) => res.data);
    },

    getContent(jobId) {
      const urlObj = { pathname: `${baseUrl}/output/${jobId}` };
      return $http.get(url.format(urlObj))
        .then((res) => res.data);
    }
  };
});
