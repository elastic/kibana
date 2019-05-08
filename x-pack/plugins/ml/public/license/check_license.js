/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';
import { XPackInfoProvider } from '../../../xpack_main/public/services/xpack_info';
import { banners, addAppRedirectMessageToUrl } from 'ui/notify';
import { LICENSE_TYPE } from '../../common/constants/license';

import chrome from 'ui/chrome';
import { EuiCallOut } from '@elastic/eui';

let licenseHasExpired = true;
let licenseType = null;
let expiredLicenseBannerId;

export function checkFullLicense(Private, kbnBaseUrl, kbnUrl) {
  const features = getFeatures(Private);
  licenseType = features.licenseType;

  if (features.isAvailable === false) {
    // ML is not enabled
    return redirectToKibana(features, kbnBaseUrl);

  } else if (features.licenseType === LICENSE_TYPE.BASIC) {

    // ML is enabled, but only with a basic or gold license
    return redirectToBasic(kbnUrl);

  } else {

    // ML is enabled
    setLicenseExpired(features);
    return Promise.resolve(features);
  }
}

export function checkBasicLicense(Private, kbnBaseUrl) {
  const features = getFeatures(Private);
  licenseType = features.licenseType;

  if (features.isAvailable === false) {
    // ML is not enabled
    return redirectToKibana(features, kbnBaseUrl);

  } else {

    // ML is enabled
    setLicenseExpired(features);
    return Promise.resolve(features);
  }
}

// a wrapper for checkFullLicense which doesn't resolve if the license has expired.
// this is used by all create jobs pages to redirect back to the jobs list
// if the user's license has expired.
export function checkLicenseExpired(Private, kbnBaseUrl, kbnUrl) {
  return checkFullLicense(Private, kbnBaseUrl, kbnUrl)
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

function setLicenseExpired(features) {
  licenseHasExpired = (features.hasExpired || false);
  // If the license has expired ML app will still work for 7 days and then
  // the job management endpoints (e.g. create job, start datafeed) will be restricted.
  // Therefore we need to keep the app enabled but show an info banner to the user.
  if(licenseHasExpired) {
    const message = features.message;
    if (expiredLicenseBannerId === undefined) {
      // Only show the banner once with no way to dismiss it
      expiredLicenseBannerId = banners.add({
        component: (
          <EuiCallOut
            iconType="iInCircle"
            color="warning"
            title={message}
          />
        ),
      });
    }
  }
}

function getFeatures(Private) {
  const xpackInfo = Private(XPackInfoProvider);
  return xpackInfo.get('features.ml');
}

function redirectToKibana(features, kbnBaseUrl) {
  const { message } = features;
  const newUrl = addAppRedirectMessageToUrl(chrome.addBasePath(kbnBaseUrl), (message || ''));
  window.location.href = newUrl;
  return Promise.halt();
}

function redirectToBasic(kbnUrl) {
  kbnUrl.redirect('/datavisualizer');
  return Promise.halt();
}

export function hasLicenseExpired() {
  return licenseHasExpired;
}

export function isFullLicense() {
  return (licenseType === LICENSE_TYPE.FULL);
}

export function xpackFeatureProvider(Private) {
  const xpackInfo = Private(XPackInfoProvider);

  return {
    isAvailable(feature) {
      return xpackInfo.get(`features.${feature}.isAvailable`, false);
    }
  };
}
