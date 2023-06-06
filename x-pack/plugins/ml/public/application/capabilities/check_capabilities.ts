/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BehaviorSubject, combineLatest, timer, from } from 'rxjs';
import { distinctUntilChanged, retry, switchMap, tap } from 'rxjs/operators';
import { isEqual } from 'lodash';
import useObservable from 'react-use/lib/useObservable';
import { useMlKibana } from '../contexts/kibana';
import { hasLicenseExpired } from '../license';

import {
  MlCapabilities,
  getDefaultCapabilities,
  MlCapabilitiesKey,
} from '../../../common/types/capabilities';
import { getCapabilities } from './get_capabilities';
import { type MlApiServices, ml } from '../services/ml_api_service';

let _capabilities: MlCapabilities = getDefaultCapabilities();

const CAPABILITIES_REFRESH_INTERVAL = 60000;

export class MlCapabilitiesService {
  private _isLoading$ = new BehaviorSubject<boolean>(true);

  /**
   * Updates on manual request, e.g. in the route resolver.
   * @private
   */
  private _updateRequested$ = new BehaviorSubject<number>(Date.now());

  private _capabilities$ = new BehaviorSubject<MlCapabilities>(getDefaultCapabilities());

  public capabilities$ = this._capabilities$.pipe(distinctUntilChanged(isEqual));

  constructor(private readonly mlApiServices: MlApiServices) {
    this.init();
  }

  private init() {
    const subscription = combineLatest([
      this._updateRequested$,
      timer(0, CAPABILITIES_REFRESH_INTERVAL),
    ])
      .pipe(
        tap(() => {
          this._isLoading$.next(true);
        }),
        switchMap(() => from(this.mlApiServices.checkMlCapabilities())),
        retry({ delay: CAPABILITIES_REFRESH_INTERVAL })
      )
      .subscribe((results) => {
        this._capabilities$.next(results.capabilities);
        this._isLoading$.next(false);
      });
  }

  public getCapabilities(): MlCapabilities {
    return this._capabilities$.getValue();
  }

  public updateCapabilities(update: MlCapabilities) {
    this._capabilities$.next(update);
  }

  public refreshCapabilities() {
    this._updateRequested$.next(Date.now());
  }
}

/**
 * TODO should be initialized in getMlGlobalServices
 * Temp solution to make it work with the current setup.
 */
export const mlCapabilities = new MlCapabilitiesService(ml);

/**
 * Check the privilege type and the license to see whether a user has permission to access a feature.
 *
 * @param capability
 */
export function usePermissionCheck<T extends MlCapabilitiesKey | MlCapabilitiesKey[]>(
  capability: T
): T extends MlCapabilitiesKey ? boolean : boolean[] {
  const {
    services: {
      mlServices: { mlCapabilities: mlCapabilitiesService },
    },
  } = useMlKibana();

  const licenseHasExpired = hasLicenseExpired();

  const capabilities = useObservable(
    mlCapabilitiesService.capabilities$,
    mlCapabilitiesService.getCapabilities()
  );

  return Array.isArray(capability)
    ? capability.map((c) => capabilities[c] && !licenseHasExpired)
    : capabilities[capability] && !licenseHasExpired;
}

export function checkGetManagementMlJobsResolver({ checkMlCapabilities }: MlApiServices) {
  return new Promise<{ mlFeatureEnabledInSpace: boolean }>((resolve, reject) => {
    checkMlCapabilities()
      .then(({ capabilities, isPlatinumOrTrialLicense, mlFeatureEnabledInSpace }) => {
        _capabilities = capabilities;
        mlCapabilities.updateCapabilities(capabilities);
        // Loop through all capabilities to ensure they are all set to true.
        const isManageML = Object.values(_capabilities).every((p) => p === true);

        if (isManageML === true && isPlatinumOrTrialLicense === true) {
          return resolve({ mlFeatureEnabledInSpace });
        } else {
          return reject({ capabilities, isPlatinumOrTrialLicense, mlFeatureEnabledInSpace });
        }
      })
      .catch((e) => {
        return reject();
      });
  });
}

export function checkGetJobsCapabilitiesResolver(
  redirectToMlAccessDeniedPage: () => Promise<void>
): Promise<MlCapabilities> {
  return new Promise((resolve, reject) => {
    getCapabilities()
      .then(async ({ capabilities, isPlatinumOrTrialLicense }) => {
        _capabilities = capabilities;
        mlCapabilities.updateCapabilities(capabilities);
        // the minimum privilege for using ML with a platinum or trial license is being able to get the transforms list.
        // all other functionality is controlled by the return capabilities object.
        // if the license is basic (isPlatinumOrTrialLicense === false) then do not redirect,
        // allow the promise to resolve as the separate license check will redirect then user to
        // a basic feature
        if (_capabilities.canGetJobs || isPlatinumOrTrialLicense === false) {
          return resolve(_capabilities);
        } else {
          await redirectToMlAccessDeniedPage();
          return reject();
        }
      })
      .catch(async (e) => {
        await redirectToMlAccessDeniedPage();
        return reject();
      });
  });
}

export function checkCreateJobsCapabilitiesResolver(
  redirectToJobsManagementPage: () => Promise<void>
): Promise<MlCapabilities> {
  return new Promise((resolve, reject) => {
    getCapabilities()
      .then(async ({ capabilities, isPlatinumOrTrialLicense }) => {
        _capabilities = capabilities;
        mlCapabilities.updateCapabilities(capabilities);
        // if the license is basic (isPlatinumOrTrialLicense === false) then do not redirect,
        // allow the promise to resolve as the separate license check will redirect then user to
        // a basic feature
        if (_capabilities.canCreateJob || isPlatinumOrTrialLicense === false) {
          return resolve(_capabilities);
        } else {
          // if the user has no permission to create a job,
          // redirect them back to the Anomaly Detection Management page
          await redirectToJobsManagementPage();
          return reject();
        }
      })
      .catch(async (e) => {
        await redirectToJobsManagementPage();
        return reject();
      });
  });
}

export function checkFindFileStructurePrivilegeResolver(
  redirectToMlAccessDeniedPage: () => Promise<void>
): Promise<MlCapabilities> {
  return new Promise((resolve, reject) => {
    getCapabilities()
      .then(async ({ capabilities }) => {
        _capabilities = capabilities;
        mlCapabilities.updateCapabilities(capabilities);
        // the minimum privilege for using ML with a basic license is being able to use the datavisualizer.
        // all other functionality is controlled by the return _capabilities object
        if (_capabilities.canFindFileStructure) {
          return resolve(_capabilities);
        } else {
          await redirectToMlAccessDeniedPage();
          return reject();
        }
      })
      .catch(async (e) => {
        await redirectToMlAccessDeniedPage();
        return reject();
      });
  });
}

/**
 * @deprecated use {@link usePermissionCheck} instead.
 * @param capability
 */
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
