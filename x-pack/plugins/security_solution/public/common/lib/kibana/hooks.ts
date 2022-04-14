/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

import { useCallback, useEffect, useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';

import { camelCase, isArray, isObject } from 'lodash';
import { set } from '@elastic/safer-lodash-set';
import {
  APP_UI_ID,
  CASES_FEATURE_ID,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_FORMAT_TZ,
} from '../../../../common/constants';
import { errorToToaster, useStateToaster } from '../../components/toasters';
import { AuthenticatedUser } from '../../../../../security/common/model';
import { NavigateToAppOptions } from '../../../../../../../src/core/public';
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

export const convertArrayToCamelCase = (arrayOfSnakes: unknown[]): unknown[] =>
  arrayOfSnakes.reduce((acc: unknown[], value) => {
    if (isArray(value)) {
      return [...acc, convertArrayToCamelCase(value)];
    } else if (isObject(value)) {
      return [...acc, convertToCamelCase(value)];
    } else {
      return [...acc, value];
    }
  }, []);

export const convertToCamelCase = <T, U extends {}>(snakeCase: T): U =>
  Object.entries(snakeCase).reduce((acc, [key, value]) => {
    if (isArray(value)) {
      set(acc, camelCase(key), convertArrayToCamelCase(value));
    } else if (isObject(value)) {
      set(acc, camelCase(key), convertToCamelCase(value));
    } else {
      set(acc, camelCase(key), value);
    }
    return acc;
  }, {} as U);

export const useCurrentUser = (): AuthenticatedElasticUser | null => {
  const isMounted = useRef(false);
  const [user, setUser] = useState<AuthenticatedElasticUser | null>(null);

  const [, dispatchToaster] = useStateToaster();

  const { security } = useKibana().services;

  const fetchUser = useCallback(
    () => {
      let didCancel = false;
      const fetchData = async () => {
        try {
          if (security != null) {
            const response = await security.authc.getCurrentUser();
            if (!isMounted.current) return;
            if (!didCancel) {
              setUser(convertToCamelCase<AuthenticatedUser, AuthenticatedElasticUser>(response));
            }
          } else {
            setUser({
              username: i18n.translate('xpack.securitySolution.getCurrentUser.unknownUser', {
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
            errorToToaster({
              title: i18n.translate('xpack.securitySolution.getCurrentUser.Error', {
                defaultMessage: 'Error getting user',
              }),
              error: error.body && error.body.message ? new Error(error.body.message) : error,
              dispatchToaster,
            });
            setUser(null);
          }
        }
      };
      fetchData();
      return () => {
        didCancel = true;
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [security]
  );

  useEffect(() => {
    isMounted.current = true;
    fetchUser();
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return user;
};

export interface UseGetUserCasesPermissions {
  crud: boolean;
  read: boolean;
}

export const useGetUserCasesPermissions = () => {
  const [casesPermissions, setCasesPermissions] = useState<UseGetUserCasesPermissions | null>(null);
  const uiCapabilities = useKibana().services.application.capabilities;

  useEffect(() => {
    setCasesPermissions({
      crud: !!uiCapabilities[CASES_FEATURE_ID]?.crud_cases,
      read: !!uiCapabilities[CASES_FEATURE_ID]?.read_cases,
    });
  }, [uiCapabilities]);

  return casesPermissions;
};

export type GetAppUrl = (param: {
  appId?: string;
  deepLinkId?: string;
  path?: string;
  absolute?: boolean;
}) => string;

/**
 * Returns a full URL to the provided page path by using
 * kibana's `getUrlForApp()`
 */

export type GetAppUrl = (param: {
  appId?: string;
  deepLinkId?: string;
  path?: string;
  absolute?: boolean;
}) => string;

export const useAppUrl = () => {
  const { getUrlForApp } = useKibana().services.application;

  const getAppUrl = useCallback<GetAppUrl>(
    ({ appId = APP_UI_ID, ...options }) => getUrlForApp(appId, options),
    [getUrlForApp]
  );
  return { getAppUrl };
};

/**
 * Navigate to any app using kibana's `navigateToApp()`
 * or by url using `navigateToUrl()`
 */

export type NavigateTo = (
  param: {
    url?: string;
    appId?: string;
  } & NavigateToAppOptions
) => void;

export const useNavigateTo = () => {
  const { navigateToApp, navigateToUrl } = useKibana().services.application;

  const navigateTo = useCallback<NavigateTo>(
    ({ url, appId = APP_UI_ID, ...options }) => {
      if (url) {
        navigateToUrl(url);
      } else {
        navigateToApp(appId, options);
      }
    },
    [navigateToApp, navigateToUrl]
  );
  return { navigateTo };
};

/**
 * Returns navigateTo and getAppUrl navigation hooks
 *
 */
export const useNavigation = () => {
  const { navigateTo } = useNavigateTo();
  const { getAppUrl } = useAppUrl();
  return { navigateTo, getAppUrl };
};
