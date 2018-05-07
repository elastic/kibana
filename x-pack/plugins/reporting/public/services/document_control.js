/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'plugins/reporting/services/job_completion_notifications';
import chrome from 'ui/chrome';
import rison from 'rison-node';
import { uiModules } from 'ui/modules';
import { QueryString } from 'ui/utils/query_string';

uiModules.get('xpack/reporting')
  .service('reportingDocumentControl', function (Private, $http, reportingJobCompletionNotifications, $injector) {
    const $Promise = $injector.get('Promise');
    const mainEntry = '/api/reporting/generate';
    const reportPrefix = chrome.addBasePath(mainEntry);

    const getJobParams = (exportType, controller, options) => {
      const jobParamsProvider = Private(exportType.JobParamsProvider);
      return $Promise.resolve(jobParamsProvider(controller, options));
    };

    this.getPath = (exportType, controller, options) => {
      return getJobParams(exportType, controller, options)
        .then(jobParams => {
          return `${reportPrefix}/${exportType.id}?${QueryString.param('jobParams', rison.encode(jobParams))}`;
        });
    };

    this.create = (relativePath) => {
      return $http.post(relativePath, {})
        .then(({ data }) => {
          reportingJobCompletionNotifications.add(data.job.id);
          return data;
        });
    };
  });
