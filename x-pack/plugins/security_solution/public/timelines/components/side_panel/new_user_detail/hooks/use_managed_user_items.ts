/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type { ManagedUserTable } from '../types';
import type {
  EntraManagedUser,
  OktaManagedUser,
} from '../../../../../../common/search_strategy/security_solution/users/managed_details';
import { ManagedUserDatasetKey } from '../../../../../../common/search_strategy/security_solution/users/managed_details';
import * as i18n from '../translations';

const isEntraManagedUser = (
  managedUser: EntraManagedUser | OktaManagedUser
): managedUser is EntraManagedUser => managedUser.event.dataset === ManagedUserDatasetKey.ENTRA;

export const useManagedUserItems = (
  managedUserDetails?: EntraManagedUser | OktaManagedUser
): ManagedUserTable[] | null =>
  useMemo(
    () =>
      !managedUserDetails
        ? null
        : [
            {
              label: i18n.USER_ID,
              value: managedUserDetails.user.id,
              field: 'user.id',
            },
            {
              label: i18n.FIRST_NAME,
              value: isEntraManagedUser(managedUserDetails)
                ? managedUserDetails.user.first_name
                : managedUserDetails.user.profile.first_name,
            },
            {
              label: i18n.LAST_NAME,
              value: isEntraManagedUser(managedUserDetails)
                ? managedUserDetails.user.last_name
                : managedUserDetails.user.profile.last_name,
            },
            {
              label: i18n.PHONE,
              value: isEntraManagedUser(managedUserDetails)
                ? managedUserDetails.user.phone
                : managedUserDetails.user.profile.primaryPhone ??
                  managedUserDetails.user.profile.mobile_phone,
            },
            {
              label: i18n.JOB_TITLE,
              value: isEntraManagedUser(managedUserDetails)
                ? managedUserDetails.user.job_title
                : managedUserDetails.user.profile.job_title,
            },
            {
              label: i18n.WORK_LOCATION,
              value: getWorkLocation(managedUserDetails),
            },
          ],
    [managedUserDetails]
  );

const getWorkLocation = (managedUserDetails: EntraManagedUser | OktaManagedUser) => {
  if (isEntraManagedUser(managedUserDetails)) {
    return managedUserDetails.user.work?.location_name;
  } else {
    const { city_name: city, country_iso_code: countryCode } = managedUserDetails.user.geo ?? {};
    if (!city || !countryCode) {
      return undefined;
    }

    return `${city}, ${countryCode}`;
  }
};
