/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



export function privilegesProvider(Promise, ml) {

  function getPrivileges() {
    const privileges = {
      canGetJobs: false,
      canCreateJob: false,
      canDeleteJob: false,
      canOpenJob: false,
      canCloseJob: false,
      canForecastJob: false,
      canGetDatafeeds: false,
      canStartStopDatafeed: false,
      canUpdateJob: false,
      canUpdateDatafeed: false,
      canPreviewDatafeed: false,
      canCreateCalendar: false,
      canDeleteCalendar: false,
    };

    return new Promise((resolve, reject) => {
      const priv = {
        cluster: [
          'cluster:monitor/xpack/ml/job/get',
          'cluster:monitor/xpack/ml/job/stats/get',
          'cluster:monitor/xpack/ml/datafeeds/get',
          'cluster:monitor/xpack/ml/datafeeds/stats/get',
          'cluster:admin/xpack/ml/job/put',
          'cluster:admin/xpack/ml/job/delete',
          'cluster:admin/xpack/ml/job/update',
          'cluster:admin/xpack/ml/job/open',
          'cluster:admin/xpack/ml/job/close',
          'cluster:admin/xpack/ml/job/forecast',
          'cluster:admin/xpack/ml/datafeeds/put',
          'cluster:admin/xpack/ml/datafeeds/delete',
          'cluster:admin/xpack/ml/datafeeds/start',
          'cluster:admin/xpack/ml/datafeeds/stop',
          'cluster:admin/xpack/ml/datafeeds/update',
          'cluster:admin/xpack/ml/datafeeds/preview',
          'cluster:admin/xpack/ml/calendars/put',
          'cluster:admin/xpack/ml/calendars/delete',
          'cluster:admin/xpack/ml/calendars/jobs/update',
          'cluster:admin/xpack/ml/calendars/events/post',
          'cluster:admin/xpack/ml/calendars/events/delete',
        ]
      };

      ml.checkPrivilege(priv)
        .then((resp) => {

        // if security has been disabled, securityDisabled is returned from the endpoint
        // therefore set all privileges to true
          if (resp.securityDisabled) {
            Object.keys(privileges).forEach(k => privileges[k] = true);
          } else {
            if (resp.cluster['cluster:monitor/xpack/ml/job/get'] &&
              resp.cluster['cluster:monitor/xpack/ml/job/stats/get']) {
              privileges.canGetJobs = true;
            }

            if (resp.cluster['cluster:monitor/xpack/ml/datafeeds/get'] &&
              resp.cluster['cluster:monitor/xpack/ml/datafeeds/stats/get']) {
              privileges.canGetDatafeeds = true;
            }

            if (resp.cluster['cluster:admin/xpack/ml/job/put'] &&
              resp.cluster['cluster:admin/xpack/ml/job/open'] &&
              resp.cluster['cluster:admin/xpack/ml/datafeeds/put']) {
              privileges.canCreateJob = true;
            }

            if (resp.cluster['cluster:admin/xpack/ml/job/update']) {
              privileges.canUpdateJob = true;
            }

            if (resp.cluster['cluster:admin/xpack/ml/job/open']) {
              privileges.canOpenJob = true;
            }

            if (resp.cluster['cluster:admin/xpack/ml/job/close']) {
              privileges.canCloseJob = true;
            }

            if (resp.cluster['cluster:admin/xpack/ml/job/forecast']) {
              privileges.canForecastJob = true;
            }

            if (resp.cluster['cluster:admin/xpack/ml/job/delete'] &&
              resp.cluster['cluster:admin/xpack/ml/datafeeds/delete']) {
              privileges.canDeleteJob = true;
            }

            if (resp.cluster['cluster:admin/xpack/ml/job/open'] &&
              resp.cluster['cluster:admin/xpack/ml/datafeeds/start'] &&
              resp.cluster['cluster:admin/xpack/ml/datafeeds/stop']) {
              privileges.canStartStopDatafeed = true;
            }

            if (resp.cluster['cluster:admin/xpack/ml/datafeeds/update']) {
              privileges.canUpdateDatafeed = true;
            }

            if (resp.cluster['cluster:admin/xpack/ml/datafeeds/preview']) {
              privileges.canPreviewDatafeed = true;
            }

            if (resp.cluster['cluster:admin/xpack/ml/calendars/put'] &&
              resp.cluster['cluster:admin/xpack/ml/calendars/jobs/update'] &&
              resp.cluster['cluster:admin/xpack/ml/calendars/events/post']) {
              privileges.canCreateCalendar = true;
            }

            if (resp.cluster['cluster:admin/xpack/ml/calendars/delete'] &&
              resp.cluster['cluster:admin/xpack/ml/calendars/events/delete']) {
              privileges.canDeleteCalendar = true;
            }
          }

          resolve(privileges);
        })
        .catch(() => {
          reject(privileges);
        });
    });
  }

  return {
    getPrivileges
  };
}
