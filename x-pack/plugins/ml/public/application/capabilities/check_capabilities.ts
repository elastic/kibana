/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  BehaviorSubject,
  combineLatest,
  from,
  type Subscription,
  timer,
  firstValueFrom,
} from 'rxjs';
import { distinctUntilChanged, filter, retry, switchMap, tap } from 'rxjs/operators';
import { isEqual } from 'lodash';
import useObservable from 'react-use/lib/useObservable';
import { useMemo, useRef } from 'react';
import { useMlKibana } from '../contexts/kibana';
import { hasLicenseExpired } from '../license';

import {
  getDefaultCapabilities,
  type MlCapabilities,
  type MlCapabilitiesKey,
} from '../../../common/types/capabilities';
import { getCapabilities } from './get_capabilities';
import type { MlApiServices } from '../services/ml_api_service';
import type { MlGlobalServices } from '../app';

let _capabilities: MlCapabilities = getDefaultCapabilities();

const CAPABILITIES_REFRESH_INTERVAL = 5 * 60 * 1000; // 5min;

export class MlCapabilitiesService {
  private _isLoading$ = new BehaviorSubject<boolean>(true);

  /**
   * Updates on manual request, e.g. in the route resolver.
   * @private
   */
  private _updateRequested$ = new BehaviorSubject<number>(Date.now());

  private _capabilities$ = new BehaviorSubject<MlCapabilities | null>(null);
  private _capabilitiesObs$ = this._capabilities$.asObservable();

  private _isPlatinumOrTrialLicense$ = new BehaviorSubject<boolean | null>(null);
  private _mlFeatureEnabledInSpace$ = new BehaviorSubject<boolean | null>(null);

  public capabilities$ = this._capabilities$.pipe(distinctUntilChanged(isEqual));

  private _subscription: Subscription | undefined;

  constructor(private readonly mlApiServices: MlApiServices) {
    this.init();
  }

  private init() {
    this._subscription = combineLatest([
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
        this._isPlatinumOrTrialLicense$.next(results.isPlatinumOrTrialLicense);
        this._mlFeatureEnabledInSpace$.next(results.mlFeatureEnabledInSpace);
        this._isLoading$.next(false);

        /**
         * To support legacy use of {@link checkPermission}
         */
        _capabilities = results.capabilities;
      });
  }

  public getCapabilities(): MlCapabilities | null {
    return this._capabilities$.getValue();
  }

  public isPlatinumOrTrialLicense(): boolean | null {
    return this._isPlatinumOrTrialLicense$.getValue();
  }

  public mlFeatureEnabledInSpace(): boolean | null {
    return this._mlFeatureEnabledInSpace$.getValue();
  }

  public getCapabilities$() {
    return this._capabilitiesObs$;
  }

  public refreshCapabilities() {
    this._updateRequested$.next(Date.now());
  }

  public destroy() {
    if (this._subscription) {
      this._subscription.unsubscribe();
    }
  }
}

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

  // Memoize argument, in case it's an array to preserve the reference.
  const requestedCapabilities = useRef(capability);

  const capabilities = useObservable(
    mlCapabilitiesService.capabilities$,
    mlCapabilitiesService.getCapabilities()
  );
  return useMemo(() => {
    return Array.isArray(requestedCapabilities.current)
      ? requestedCapabilities.current.map((c) => capabilities[c])
      : capabilities[requestedCapabilities.current];
  }, [capabilities]);
}

export function checkGetManagementMlJobsResolver({ mlCapabilities }: MlGlobalServices) {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const capabilities = await firstValueFrom(
        mlCapabilities.getCapabilities$().pipe(filter((c) => !!c))
      );

      if (capabilities === null) {
        return reject();
      }
      _capabilities = capabilities;
      const isManageML =
        (capabilities.isADEnabled && capabilities.canCreateJob) ||
        (capabilities.isDFAEnabled && capabilities.canCreateDataFrameAnalytics) ||
        (capabilities.isNLPEnabled && capabilities.canCreateTrainedModels);
      if (isManageML === true) {
        return resolve();
      } else {
        // reject with possible reasons why capabilities are false
        return reject({
          capabilities,
          isPlatinumOrTrialLicense: mlCapabilities.isPlatinumOrTrialLicense(),
          mlFeatureEnabledInSpace: mlCapabilities.mlFeatureEnabledInSpace(),
        });
      }
    } catch (error) {
      reject(error);
    }
  });
}

export function checkCreateJobsCapabilitiesResolver(
  redirectToJobsManagementPage: () => Promise<void>
): Promise<MlCapabilities> {
  return new Promise((resolve, reject) => {
    getCapabilities()
      .then(async ({ capabilities, isPlatinumOrTrialLicense }) => {
        _capabilities = capabilities;
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
