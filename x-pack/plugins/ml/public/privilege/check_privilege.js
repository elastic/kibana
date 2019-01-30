/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { i18n } from '@kbn/i18n';
import { getPrivileges } from './get_privileges';
import { hasLicenseExpired } from '../license/check_license';

let privileges = {};

export function checkGetJobsPrivilege(Private, Promise, kbnUrl) {
  return new Promise((resolve, reject) => {
    getPrivileges()
      .then((priv) => {
        privileges = priv;
        // the minimum privilege for using ML with a platinum license is being able to get the jobs list.
        // all other functionality is controlled by the return privileges object
        if (privileges.canGetJobs) {
          return resolve(privileges);
        } else {
          kbnUrl.redirect('/access-denied');
          return reject();
        }
      });
  });
}

export function checkCreateJobsPrivilege(Private, Promise, kbnUrl) {
  return new Promise((resolve, reject) => {
    getPrivileges()
      .then((priv) => {
        privileges = priv;
        if (privileges.canCreateJob) {
          return resolve(privileges);
        } else {
          // if the user has no permission to create a job,
          // redirect them back to the Jobs Management page
          kbnUrl.redirect('/jobs');
          return reject();
        }
      });
  });
}

export function checkFindFileStructurePrivilege(Private, Promise, kbnUrl) {
  return new Promise((resolve, reject) => {
    getPrivileges()
      .then((priv) => {
        privileges = priv;
        // the minimum privilege for using ML with a basic license is being able to use the datavisualizer.
        // all other functionality is controlled by the return privileges object
        if (privileges.canFindFileStructure) {
          return resolve(privileges);
        } else {
          kbnUrl.redirect('/access-denied');
          return reject();
        }
      });
  });
}

// check the privilege type and the license to see whether a user has permission to access a feature.
// takes the name of the privilege variable as specified in get_privileges.js
export function checkPermission(privilegeType) {
  const licenseHasExpired = hasLicenseExpired();
  return (privileges[privilegeType] === true && licenseHasExpired !== true);
}

// create the text for the button's tooltips if the user's license has
// expired or if they don't have the privilege to press that button
export function createPermissionFailureMessage(privilegeType) {
  let message = '';
  const licenseHasExpired = hasLicenseExpired();
  if (licenseHasExpired) {
    message = i18n.translate('xpack.ml.privilege.licenseHasExpiredTooltip', {
      defaultMessage: 'Your license has expired.'
    });
  } else if (privilegeType === 'canCreateJob') {
    message = i18n.translate('xpack.ml.privilege.noPermission.createMLJobsTooltip', {
      defaultMessage: 'You do not have permission to create Machine Learning jobs.'
    });
  } else if (privilegeType === 'canStartStopDatafeed') {
    message = i18n.translate('xpack.ml.privilege.noPermission.startOrStopDatafeedsTooltip', {
      defaultMessage: 'You do not have permission to start or stop datafeeds.'
    });
  } else if (privilegeType === 'canUpdateJob') {
    message = i18n.translate('xpack.ml.privilege.noPermission.editJobsTooltip', {
      defaultMessage: 'You do not have permission to edit jobs.'
    });
  } else if (privilegeType === 'canDeleteJob') {
    message = i18n.translate('xpack.ml.privilege.noPermission.deleteJobsTooltip', {
      defaultMessage: 'You do not have permission to delete jobs.'
    });
  } else if (privilegeType === 'canCreateCalendar') {
    message = i18n.translate('xpack.ml.privilege.noPermission.createCalendarsTooltip', {
      defaultMessage: 'You do not have permission to create calendars.'
    });
  } else if (privilegeType === 'canDeleteCalendar') {
    message = i18n.translate('xpack.ml.privilege.noPermission.deleteCalendarsTooltip', {
      defaultMessage: 'You do not have permission to delete calendars.'
    });
  } else if (privilegeType === 'canForecastJob') {
    message = i18n.translate('xpack.ml.privilege.noPermission.runForecastsTooltip', {
      defaultMessage: 'You do not have permission to run forecasts.'
    });
  }
  return i18n.translate('xpack.ml.privilege.pleaseContactAdministratorTooltip', {
    defaultMessage: '{message} Please contact your administrator.',
    values: {
      message,
    }
  });
}
