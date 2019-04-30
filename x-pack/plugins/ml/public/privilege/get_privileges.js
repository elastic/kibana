/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { ml } from 'plugins/ml/services/ml_api_service';
import { setUpgradeInProgress } from '../services/upgrade_service';

export function getPrivileges() {
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
    canGetCalendars: false,
    canCreateCalendar: false,
    canDeleteCalendar: false,
    canGetFilters: false,
    canCreateFilter: false,
    canDeleteFilter: false,
    canFindFileStructure: false,
  };

  return new Promise((resolve, reject) => {
    const priv = {
      cluster: [
        'cluster:monitor/xpack/ml/job/get',
        'cluster:monitor/xpack/ml/job/stats/get',
        'cluster:monitor/xpack/ml/datafeeds/get',
        'cluster:monitor/xpack/ml/datafeeds/stats/get',
        'cluster:monitor/xpack/ml/calendars/get',
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
        'cluster:admin/xpack/ml/filters/put',
        'cluster:admin/xpack/ml/filters/get',
        'cluster:admin/xpack/ml/filters/update',
        'cluster:admin/xpack/ml/filters/delete',
        'cluster:monitor/xpack/ml/findfilestructure',
      ]
    };

    ml.checkPrivilege(priv)
      .then((resp) => {

        if(resp.upgradeInProgress === true) {
          setUpgradeInProgress(true);
          // only check for getting endpoints
          // force all to be true if security is disabled
          setGettingPrivileges(resp.cluster, privileges, (resp.securityDisabled === true));
        }
        else if (resp.securityDisabled) {
          // if security has been disabled, securityDisabled is returned from the endpoint
          // therefore set all privileges to true
          Object.keys(privileges).forEach(k => privileges[k] = true);
        } else {
          setGettingPrivileges(resp.cluster, privileges);
          setActionPrivileges(resp.cluster, privileges);
        }

        resolve(privileges);
      })
      .catch(() => {
        reject(privileges);
      });
  });
}

function setGettingPrivileges(cluster = {}, privileges = {}, forceTrue = false) {
  if (
    forceTrue ||
    (cluster['cluster:monitor/xpack/ml/job/get'] &&
    cluster['cluster:monitor/xpack/ml/job/stats/get'])
  ) {
    privileges.canGetJobs = true;
  }

  if (
    forceTrue ||
    (cluster['cluster:monitor/xpack/ml/datafeeds/get'] &&
    cluster['cluster:monitor/xpack/ml/datafeeds/stats/get'])
  ) {
    privileges.canGetDatafeeds = true;
  }

  if (forceTrue || cluster['cluster:monitor/xpack/ml/calendars/get']) {
    privileges.canGetCalendars = true;
  }

  if (forceTrue || cluster['cluster:admin/xpack/ml/filters/get']) {
    privileges.canGetFilters = true;
  }

  if (forceTrue || cluster['cluster:monitor/xpack/ml/findfilestructure']) {
    privileges.canFindFileStructure = true;
  }
}

function setActionPrivileges(cluster = {}, privileges = {}) {
  if (cluster['cluster:admin/xpack/ml/job/put'] &&
    cluster['cluster:admin/xpack/ml/job/open'] &&
    cluster['cluster:admin/xpack/ml/datafeeds/put']) {
    privileges.canCreateJob = true;
  }

  if (cluster['cluster:admin/xpack/ml/job/update']) {
    privileges.canUpdateJob = true;
  }

  if (cluster['cluster:admin/xpack/ml/job/open']) {
    privileges.canOpenJob = true;
  }

  if (cluster['cluster:admin/xpack/ml/job/close']) {
    privileges.canCloseJob = true;
  }

  if (cluster['cluster:admin/xpack/ml/job/forecast']) {
    privileges.canForecastJob = true;
  }

  if (cluster['cluster:admin/xpack/ml/job/delete'] &&
    cluster['cluster:admin/xpack/ml/datafeeds/delete']) {
    privileges.canDeleteJob = true;
  }

  if (cluster['cluster:admin/xpack/ml/job/open'] &&
    cluster['cluster:admin/xpack/ml/datafeeds/start'] &&
    cluster['cluster:admin/xpack/ml/datafeeds/stop']) {
    privileges.canStartStopDatafeed = true;
  }

  if (cluster['cluster:admin/xpack/ml/datafeeds/update']) {
    privileges.canUpdateDatafeed = true;
  }

  if (cluster['cluster:admin/xpack/ml/datafeeds/preview']) {
    privileges.canPreviewDatafeed = true;
  }

  if (cluster['cluster:admin/xpack/ml/calendars/put'] &&
    cluster['cluster:admin/xpack/ml/calendars/jobs/update'] &&
    cluster['cluster:admin/xpack/ml/calendars/events/post']) {
    privileges.canCreateCalendar = true;
  }

  if (cluster['cluster:admin/xpack/ml/calendars/delete'] &&
    cluster['cluster:admin/xpack/ml/calendars/events/delete']) {
    privileges.canDeleteCalendar = true;
  }

  if (cluster['cluster:admin/xpack/ml/filters/put'] &&
    cluster['cluster:admin/xpack/ml/filters/update']) {
    privileges.canCreateFilter = true;
  }

  if (cluster['cluster:admin/xpack/ml/filters/delete']) {
    privileges.canDeleteFilter = true;
  }
}
