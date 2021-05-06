/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

import { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { DEFAULT_DATE_FORMAT, DEFAULT_DATE_FORMAT_TZ } from '../../../../common/constants';
import { AuthenticatedUser } from '../../../../../security/common/model';
import { convertToCamelCase } from '../../../containers/utils';
import { StartServices } from '../../../types';
import { useUiSetting, useKibana } from './kibana_react';

export const useDateFormat = (): string => useUiSetting<string>(DEFAULT_DATE_FORMAT);

export const useTimeZone = (): string => {
  const timeZone = useUiSetting<string>(DEFAULT_DATE_FORMAT_TZ);
  return timeZone === 'Browser' ? moment.tz.guess() : timeZone;
};

export const useBasePath = (): string => useKibana().services.http.basePath.get();

export const useToasts = (): StartServices['notifications']['toasts'] =>
  useKibana().services.notifications.toasts;

export const useHttp = (): StartServices['http'] => useKibana().services.http;

interface UserRealm {
  name: string;
  type: string;
}

export interface AuthenticatedElasticUser {
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  enabled: boolean;
  metadata?: {
    _reserved: boolean;
  };
  authenticationRealm: UserRealm;
  lookupRealm: UserRealm;
  authenticationProvider: string;
}

export const useCurrentUser = (): AuthenticatedElasticUser | null => {
  const [user, setUser] = useState<AuthenticatedElasticUser | null>(null);

  const toasts = useToasts();

  const { security } = useKibana().services;

  const fetchUser = useCallback(() => {
    let didCancel = false;
    const fetchData = async () => {
      try {
        if (security != null) {
          const response = await security.authc.getCurrentUser();
          if (!didCancel) {
            setUser(convertToCamelCase<AuthenticatedUser, AuthenticatedElasticUser>(response));
          }
        } else {
          setUser({
            username: i18n.translate('xpack.cases.getCurrentUser.unknownUser', {
              defaultMessage: 'Unknown',
            }),
            email: '',
            fullName: '',
            roles: [],
            enabled: false,
            authenticationRealm: { name: '', type: '' },
            lookupRealm: { name: '', type: '' },
            authenticationProvider: '',
          });
        }
      } catch (error) {
        if (!didCancel) {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.translate('xpack.cases.getCurrentUser.Error', {
                defaultMessage: 'Error getting user',
              }),
            }
          );
          setUser(null);
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, [security, toasts]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);
  return user;
};

export interface UseGetUserSavedObjectPermissions {
  crud: boolean;
  read: boolean;
}

export const useGetUserSavedObjectPermissions = () => {
  const [
    savedObjectsPermissions,
    setSavedObjectsPermissions,
  ] = useState<UseGetUserSavedObjectPermissions | null>(null);
  const uiCapabilities = useKibana().services.application.capabilities;

  useEffect(() => {
    const capabilitiesCanUserCRUD: boolean =
      typeof uiCapabilities.siem.crud === 'boolean' ? uiCapabilities.siem.crud : false;
    const capabilitiesCanUserRead: boolean =
      typeof uiCapabilities.siem.show === 'boolean' ? uiCapabilities.siem.show : false;
    setSavedObjectsPermissions({
      crud: capabilitiesCanUserCRUD,
      read: capabilitiesCanUserRead,
    });
  }, [uiCapabilities]);

  return savedObjectsPermissions;
};
