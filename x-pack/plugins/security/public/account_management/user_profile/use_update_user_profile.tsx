/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { first, lastValueFrom } from 'rxjs';

import type { NotificationsStart, ToastInput, ToastOptions } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import type { UserProfileData } from '../../../common/model/user_profile';
import type { UserProfileAPIClient } from './user_profile_api_client';

interface ThemeDarkModeUpdate {
  key: 'darkMode';
  value: '' | 'dark' | 'light';
}

type KeyValueUpdateProps = ThemeDarkModeUpdate;

interface Deps {
  apiClient: UserProfileAPIClient;
  notifications: NotificationsStart;
}

type Hook = () => {
  /** Replace the user profile data with new data. */
  overwrite: (data: UserProfileData) => void;
  /** Partially update the user profile data, merging existing data. */
  partialUpdate: (data: Partial<UserProfileData>) => void;
  /** Update a single key/value of user profile data. */
  keyValueUpdate: (data: KeyValueUpdateProps) => void;
  userProfileData: UserProfileData | undefined | null;
};

let useUpdateUserProfile: Hook | undefined;

export const getUseUpdateUserProfile = ({ apiClient, notifications }: Deps) => {
  if (useUpdateUserProfile) {
    return useUpdateUserProfile;
  }

  const { userProfile$ } = apiClient;

  useUpdateUserProfile = () => {
    const userProfileData = useObservable(userProfile$);

    const onUserProfileUpdate = useCallback(
      (updatedData: UserProfileData) => {
        let isRefreshRequired = false;
        if (userProfileData?.userSettings?.darkMode !== updatedData?.userSettings?.darkMode) {
          isRefreshRequired = true;
        }

        let successToastInput: ToastInput = {
          title: i18n.translate('xpack.security.accountManagement.userProfile.submitSuccessTitle', {
            defaultMessage: 'Profile updated',
          }),
        };
        let successToastOptions: ToastOptions = {};

        if (isRefreshRequired) {
          successToastOptions = {
            toastLifeTimeMs: 1000 * 60 * 5,
          };

          successToastInput = {
            ...successToastInput,
            text: toMountPoint(
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <p>
                    {i18n.translate(
                      'xpack.security.accountManagement.userProfile.requiresPageReloadToastDescription',
                      {
                        defaultMessage:
                          'One or more settings require you to reload the page to take effect.',
                      }
                    )}
                  </p>
                  <EuiButton
                    size="s"
                    onClick={() => window.location.reload()}
                    data-test-subj="windowReloadButton"
                  >
                    {i18n.translate(
                      'xpack.security.accountManagement.userProfile.requiresPageReloadToastButtonLabel',
                      {
                        defaultMessage: 'Reload page',
                      }
                    )}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
          };
        }

        notifications.toasts.addSuccess(successToastInput, successToastOptions);
      },
      [userProfileData]
    );

    const getCurrentData = useCallback(async () => {
      const currentData =
        (await lastValueFrom(
          userProfile$.pipe(
            first((data) => {
              // Wait for the initial fetched data to be returned
              return Boolean(data);
            })
          )
        )) ?? {};
      return currentData;
    }, []);

    const overwrite = useCallback(
      (udpatedData: UserProfileData) => {
        return apiClient.update(udpatedData).then(() => onUserProfileUpdate(udpatedData));
      },
      [onUserProfileUpdate]
    );

    const partialUpdate = useCallback(
      async (props: Partial<UserProfileData>) => {
        const currentData = await getCurrentData();

        const userSettings = props.userSettings
          ? {
              ...currentData.userSettings,
              ...props.userSettings,
            }
          : currentData.userSettings;

        const updatedData = {
          ...currentData,
          ...props,
          userSettings,
        };

        return overwrite(updatedData);
      },
      [getCurrentData, overwrite]
    );

    const keyValueUpdate = useCallback(
      async (props: KeyValueUpdateProps) => {
        const currentData = await getCurrentData();

        // For now we only support updating the dark mode theme, which lives inside the "userSettings" object.
        const updatedData = {
          ...currentData,
          userSettings: {
            ...currentData.userSettings,
            [props.key]: props.value,
          },
        };

        return overwrite(updatedData);
      },
      [getCurrentData, overwrite]
    );

    return useMemo(
      () => ({
        overwrite,
        partialUpdate,
        keyValueUpdate,
        userProfileData,
      }),
      [overwrite, partialUpdate, keyValueUpdate, userProfileData]
    );
  };

  return useUpdateUserProfile;
};
