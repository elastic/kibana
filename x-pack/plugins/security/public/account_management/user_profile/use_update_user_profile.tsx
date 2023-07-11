/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';

import type { NotificationsStart, ToastInput, ToastOptions } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import type { UserProfileData } from './user_profile';
import type { UserProfileAPIClient } from './user_profile_api_client';

interface Deps {
  apiClient: UserProfileAPIClient;
  notifications: NotificationsStart;
}

interface Props {
  notificationSuccess?: {
    /** Flag to indicate if a notification is shown after update. Default: `true` */
    enabled?: boolean;
    /** Customize the title of the notification */
    title?: string;
    /** Customize the "page reload needed" text of the notification */
    pageReloadText?: string;
  };
  /** Predicate to indicate if the update requires a page reload */
  pageReloadChecker?: (
    previsous: UserProfileData | null | undefined,
    next: UserProfileData
  ) => boolean;
}

export type UpdateUserProfileHook = (props?: Props) => {
  /** Update the user profile */
  update: (data: UserProfileData) => void;
  /** Handler to show a notification after the user profile has been updated */
  showSuccessNotification: (props: { isRefreshRequired: boolean }) => void;
  /** Flag to indicate if currently updating */
  isLoading: boolean;
  /** The current user profile data */
  userProfileData?: UserProfileData | null;
};

const i18nTexts = {
  notificationSuccess: {
    title: i18n.translate('xpack.security.accountManagement.userProfile.submitSuccessTitle', {
      defaultMessage: 'Profile updated',
    }),
    pageReloadText: i18n.translate(
      'xpack.security.accountManagement.userProfile.requiresPageReloadToastDescription',
      {
        defaultMessage: 'One or more settings require you to reload the page to take effect.',
      }
    ),
  },
};

export const getUseUpdateUserProfile = ({ apiClient, notifications }: Deps) => {
  const { userProfile$ } = apiClient;

  const useUpdateUserProfile = ({ notificationSuccess = {}, pageReloadChecker }: Props = {}) => {
    const {
      enabled: notificationSuccessEnabled = true,
      title: notificationTitle = i18nTexts.notificationSuccess.title,
      pageReloadText = i18nTexts.notificationSuccess.pageReloadText,
    } = notificationSuccess;
    const [isLoading, setIsLoading] = useState(false);
    const userProfileData = useObservable(userProfile$);
    // Keep a snapshot before updating the user profile so we can compare previous and updated values
    const userProfileSnapshot = useRef<UserProfileData | null>();

    const showSuccessNotification = useCallback(
      ({ isRefreshRequired = false }: { isRefreshRequired?: boolean } = {}) => {
        let successToastInput: ToastInput = {
          title: notificationTitle,
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
                  <p>{pageReloadText}</p>
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
      [notificationTitle, pageReloadText]
    );

    const onUserProfileUpdate = useCallback(
      (updatedData: UserProfileData) => {
        setIsLoading(false);

        if (notificationSuccessEnabled) {
          const isRefreshRequired = pageReloadChecker?.(userProfileSnapshot.current, updatedData);
          showSuccessNotification({ isRefreshRequired });
        }
      },
      [notificationSuccessEnabled, showSuccessNotification, pageReloadChecker]
    );

    const update = useCallback(
      <D extends UserProfileData>(udpatedData: D) => {
        userProfileSnapshot.current = userProfileData;
        setIsLoading(true);
        return apiClient.update(udpatedData).then(() => onUserProfileUpdate(udpatedData));
      },
      [onUserProfileUpdate, userProfileData]
    );

    return {
      update,
      showSuccessNotification,
      userProfileData,
      isLoading,
    };
  };

  return useUpdateUserProfile;
};
