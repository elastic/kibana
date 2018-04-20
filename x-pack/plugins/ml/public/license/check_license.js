/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import { notify, Notifier } from 'ui/notify';
import _ from 'lodash';

import chrome from 'ui/chrome';

export function checkLicense(Private, Promise, kbnBaseUrl) {
  const xpackInfo = Private(XPackInfoProvider);
  const features = xpackInfo.get('features.ml');

  const licenseAllowsToShowThisPage = features.isAvailable;
  if (!licenseAllowsToShowThisPage) {
    const message = features.message;
    let queryString = `?${Notifier.QS_PARAM_LOCATION}=Machine Learning&`;
    queryString += `${Notifier.QS_PARAM_LEVEL}=error&${Notifier.QS_PARAM_MESSAGE}=${message}`;
    const url = `${chrome.addBasePath(kbnBaseUrl)}#${queryString}`;

    window.location.href = url;
    return Promise.halt();
  }

  const licenseHasExpired = features.hasExpired || false;

  // If the license has expired ML app will still work for 7 days and then
  // the job management endpoints (e.g. create job, start datafeed) will be restricted.
  // Therefore we need to keep the app enabled but show an info banner to the user.
  if(licenseHasExpired) {
    const message = features.message;
    const exists = _.find(notify._notifs, (item) => item.content === message);
    if (!exists) {
      // Only show the banner once with no countdown
      notify.warning(message, { lifetime: 0 });
    }
  }

  return Promise.resolve(features);
}

// a wrapper for checkLicense which doesn't resolve if the license has expired.
// this is used by all create jobs pages to redirect back to the jobs list
// if the user's license has expired.
export function checkLicenseExpired(Private, Promise, kbnBaseUrl, kbnUrl) {
  return checkLicense(Private, Promise, kbnBaseUrl)
    .then((features) => {
      if (features.hasExpired) {
        kbnUrl.redirect('/jobs');
        return Promise.halt();
      } else {
        return Promise.resolve(features);
      }
    })
    .catch(() => {
      return Promise.halt();
    });
}
