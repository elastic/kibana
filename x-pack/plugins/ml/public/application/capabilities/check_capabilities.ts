/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { hasLicenseExpired } from '../license';

import { MlCapabilities, getDefaultCapabilities } from '../../../common/types/capabilities';
import { getCapabilities, getManageMlCapabilities } from './get_capabilities';

let _capabilities: MlCapabilities = getDefaultCapabilities();

export function checkGetManagementMlJobsResolver() {
  return new Promise<{ mlFeatureEnabledInSpace: boolean }>((resolve, reject) => {
    getManageMlCapabilities()
      .then(({ capabilities, isPlatinumOrTrialLicense, mlFeatureEnabledInSpace }) => {
        _capabilities = capabilities;
        // Loop through all capabilities to ensure they are all set to true.
        const isManageML = Object.values(_capabilities).every((p) => p === true);

        if (isManageML === true && isPlatinumOrTrialLicense === true) {
          return resolve({ mlFeatureEnabledInSpace });
        } else {
          return reject();
        }
      })
      .catch((e) => {
        return reject();
      });
  });
}

export function checkGetJobsCapabilitiesResolver(): Promise<MlCapabilities> {
  return new Promise((resolve, reject) => {
    getCapabilities()
      .then(({ capabilities, isPlatinumOrTrialLicense }) => {
        _capabilities = capabilities;
        // the minimum privilege for using ML with a platinum or trial license is being able to get the transforms list.
        // all other functionality is controlled by the return capabilities object.
        // if the license is basic (isPlatinumOrTrialLicense === false) then do not redirect,
        // allow the promise to resolve as the separate license check will redirect then user to
        // a basic feature
        if (_capabilities.canGetJobs || isPlatinumOrTrialLicense === false) {
          return resolve(_capabilities);
        } else {
          window.location.href = '#/access-denied';
          return reject();
        }
      })
      .catch((e) => {
        window.location.href = '#/access-denied';
        return reject();
      });
  });
}

export function checkCreateJobsCapabilitiesResolver(): Promise<MlCapabilities> {
  return new Promise((resolve, reject) => {
    getCapabilities()
      .then(({ capabilities, isPlatinumOrTrialLicense }) => {
        _capabilities = capabilities;
        // if the license is basic (isPlatinumOrTrialLicense === false) then do not redirect,
        // allow the promise to resolve as the separate license check will redirect then user to
        // a basic feature
        if (_capabilities.canCreateJob || isPlatinumOrTrialLicense === false) {
          return resolve(_capabilities);
        } else {
          // if the user has no permission to create a job,
          // redirect them back to the Transforms Management page
          window.location.href = '#/jobs';
          return reject();
        }
      })
      .catch((e) => {
        window.location.href = '#/jobs';
        return reject();
      });
  });
}

export function checkFindFileStructurePrivilegeResolver(): Promise<MlCapabilities> {
  return new Promise((resolve, reject) => {
    getCapabilities()
      .then(({ capabilities }) => {
        _capabilities = capabilities;
        // the minimum privilege for using ML with a basic license is being able to use the datavisualizer.
        // all other functionality is controlled by the return _capabilities object
        if (_capabilities.canFindFileStructure) {
          return resolve(_capabilities);
        } else {
          window.location.href = '#/access-denied';
          return reject();
        }
      })
      .catch((e) => {
        window.location.href = '#/access-denied';
        return reject();
      });
  });
}

// check the privilege type and the license to see whether a user has permission to access a feature.
// takes the name of the privilege variable as specified in get_privileges.js
export function checkPermission(capability: keyof MlCapabilities) {
  const licenseHasExpired = hasLicenseExpired();
  return _capabilities[capability] === true && licenseHasExpired !== true;
}

// create the text for the button's tooltips if the user's license has
// expired or if they don't have the privilege to press that button
export function createPermissionFailureMessage(privilegeType: keyof MlCapabilities) {
  let message = '';
  const licenseHasExpired = hasLicenseExpired();
  if (licenseHasExpired) {
    message = i18n.translate('xpack.ml.privilege.licenseHasExpiredTooltip', {
      defaultMessage: 'Your license has expired.',
    });
  } else if (privilegeType === 'canCreateJob') {
    message = i18n.translate('xpack.ml.privilege.noPermission.createMLJobsTooltip', {
      defaultMessage: 'You do not have permission to create Machine Learning jobs.',
    });
  } else if (privilegeType === 'canStartStopDatafeed') {
    message = i18n.translate('xpack.ml.privilege.noPermission.startOrStopDatafeedsTooltip', {
      defaultMessage: 'You do not have permission to start or stop datafeeds.',
    });
  } else if (privilegeType === 'canUpdateJob') {
    message = i18n.translate('xpack.ml.privilege.noPermission.editJobsTooltip', {
      defaultMessage: 'You do not have permission to edit jobs.',
    });
  } else if (privilegeType === 'canDeleteJob') {
    message = i18n.translate('xpack.ml.privilege.noPermission.deleteJobsTooltip', {
      defaultMessage: 'You do not have permission to delete jobs.',
    });
  } else if (privilegeType === 'canCreateCalendar') {
    message = i18n.translate('xpack.ml.privilege.noPermission.createCalendarsTooltip', {
      defaultMessage: 'You do not have permission to create calendars.',
    });
  } else if (privilegeType === 'canDeleteCalendar') {
    message = i18n.translate('xpack.ml.privilege.noPermission.deleteCalendarsTooltip', {
      defaultMessage: 'You do not have permission to delete calendars.',
    });
  } else if (privilegeType === 'canForecastJob') {
    message = i18n.translate('xpack.ml.privilege.noPermission.runForecastsTooltip', {
      defaultMessage: 'You do not have permission to run forecasts.',
    });
  }
  return i18n.translate('xpack.ml.privilege.pleaseContactAdministratorTooltip', {
    defaultMessage: '{message} Please contact your administrator.',
    values: {
      message,
    },
  });
}
