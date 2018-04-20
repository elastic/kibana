/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { privilegesProvider } from 'plugins/ml/privilege/get_privileges';

export function checkGetJobsPrivilege(Private, Promise, kbnUrl) {
  const mlPrivilegeService = Private(privilegesProvider);

  return new Promise((resolve, reject) => {
    mlPrivilegeService.getPrivileges()
      .then((privileges) => {
      // the minimum privilege for using ML is being able to get the jobs list.
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
  const mlPrivilegeService = Private(privilegesProvider);

  return new Promise((resolve, reject) => {
    mlPrivilegeService.getPrivileges()
      .then((privileges) => {
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

// permission check provider, requires privileges and CheckLicense from $route
// these need to have been loaded for the page, which currently happens for all pages
export function permissionCheckProvider($route) {
  const privileges = $route.current.locals.privileges;
  const licenseDetails = $route.current.locals.CheckLicense;

  // check the privilege type and the license to see whether a user has permission to access a feature.
  // takes the name of the privilege variable as specified in get_privileges.js
  function checkPermission(privilegeType) {
    return (privileges[privilegeType] === true && licenseDetails.hasExpired !== true);
  }

  // create the text for the button's tooltips if the user's license has
  // expired or if they don't have the privilege to press that button
  function createPermissionFailureMessage(privilegeType) {
    let message = '';
    if (licenseDetails.hasExpired) {
      message = 'Your license has expired.';
    } else if (privilegeType === 'canCreateJob') {
      message = 'You do not have permission to create Machine Learning jobs.';
    } else if (privilegeType === 'canStartStopDatafeed') {
      message = 'You do not have permission to start or stop datafeeds.';
    } else if (privilegeType === 'canUpdateJob') {
      message = 'You do not have permission to edit jobs.';
    } else if (privilegeType === 'canDeleteJob') {
      message = 'You do not have permission to delete jobs.';
    } else if (privilegeType === 'canCreateCalendar') {
      message = 'You do not have permission to create calendars.';
    } else if (privilegeType === 'canDeleteCalendar') {
      message = 'You do not have permission to delete calendars.';
    } else if (privilegeType === 'canForecastJob') {
      message = 'You do not have permission to run forecasts.';
    }
    return `${message} Please contact your administrator.`;
  }

  return {
    checkPermission,
    createPermissionFailureMessage
  };
}
