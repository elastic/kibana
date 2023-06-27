/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiColorPicker,
  EuiDescribedFormGroup,
  EuiDescriptionList,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiIconTip,
  EuiPageTemplate_Deprecated as EuiPageTemplate,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { Form, FormikProvider, useFormik, useFormikContext } from 'formik';
import type { FunctionComponent } from 'react';
import React, { useRef, useState } from 'react';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';

import type { CoreStart, IUiSettingsClient, ToastInput, ToastOptions } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint, useKibana } from '@kbn/kibana-react-plugin/public';
import { UserAvatar } from '@kbn/user-profile-components';

import type { AuthenticatedUser, UserProfileAvatarData } from '../../../common';
import {
  canUserChangeDetails,
  canUserChangePassword,
  getUserAvatarColor,
  getUserAvatarInitials,
} from '../../../common/model';
import type { UserSettingsData } from '../../../common/model/user_profile';
import { useSecurityApiClients } from '../../components';
import { Breadcrumb } from '../../components/breadcrumb';
import {
  FormChangesProvider,
  useFormChanges,
  useFormChangesContext,
} from '../../components/form_changes';
import { FormField } from '../../components/form_field';
import { FormLabel } from '../../components/form_label';
import { FormRow, OptionalText } from '../../components/form_row';
import { ChangePasswordModal } from '../../management/users/edit_user/change_password_modal';
import { isUserReserved } from '../../management/users/user_utils';
import { createImageHandler, getRandomColor, IMAGE_FILE_TYPES, VALID_HEX_COLOR } from './utils';

export interface UserProfileProps {
  user: AuthenticatedUser;
  data?: {
    avatar?: UserProfileAvatarData;
    userSettings?: UserSettingsData;
  };
}

export interface UserProfileFormValues {
  user: {
    full_name: string;
    email: string;
  };
  data?: {
    avatar: {
      initials: string;
      color: string;
      imageUrl: string;
    };
    userSettings: {
      darkMode: string;
    };
  };
  avatarType: 'initials' | 'image';
}

function UserDetailsEditor({ user }: { user: AuthenticatedUser }) {
  const { services } = useKibana<CoreStart>();

  const canChangeDetails = canUserChangeDetails(user, services.application.capabilities);
  if (!canChangeDetails) {
    return null;
  }

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <h2>
          <FormattedMessage
            id="xpack.security.accountManagement.userProfile.detailsGroupTitle"
            defaultMessage="Details"
          />
        </h2>
      }
      description={
        <FormattedMessage
          id="xpack.security.accountManagement.userProfile.detailsGroupDescription"
          defaultMessage="Provide some basic information about yourself."
        />
      }
    >
      <FormRow
        label={
          <FormLabel for="user.full_name">
            <FormattedMessage
              id="xpack.security.accountManagement.userProfile.fullNameLabel"
              defaultMessage="Full name"
            />
          </FormLabel>
        }
        labelAppend={<OptionalText />}
        fullWidth
      >
        <FormField name="user.full_name" fullWidth />
      </FormRow>

      <FormRow
        label={
          <FormLabel for="user.email">
            <FormattedMessage
              id="xpack.security.accountManagement.userProfile.emailLabel"
              defaultMessage="Email address"
            />
          </FormLabel>
        }
        labelAppend={<OptionalText />}
        fullWidth
      >
        <FormField type="email" name="user.email" fullWidth />
      </FormRow>
    </EuiDescribedFormGroup>
  );
}

function UserSettingsEditor({
  formik,
  isThemeOverridden,
  isOverriddenThemeDarkMode,
}: {
  formik: ReturnType<typeof useUserProfileForm>;
  isThemeOverridden: boolean;
  isOverriddenThemeDarkMode: boolean;
}) {
  if (!formik.values.data) {
    return null;
  }

  let idSelected = formik.values.data.userSettings.darkMode;

  if (isThemeOverridden) {
    if (isOverriddenThemeDarkMode) {
      idSelected = 'dark';
    } else {
      idSelected = 'light';
    }
  }

  return (
    <EuiDescribedFormGroup
      fullWidth
      fieldFlexItemProps={{ style: { alignSelf: 'flex-start' } }}
      title={
        <h2>
          <FormattedMessage
            id="xpack.security.accountManagement.userProfile.userSettingsTitle"
            defaultMessage="Theme"
          />
        </h2>
      }
      description={
        <FormattedMessage
          id="xpack.security.accountManagement.userProfile.themeFormGroupDescription"
          defaultMessage="Select the appearance of your interface."
        />
      }
    >
      <FormRow
        name="data.userSettings.darkMode"
        helpText={renderHelpText(isThemeOverridden)}
        label={
          <FormLabel for="data.userSettings.darkMode">
            <FormattedMessage
              id="xpack.security.accountManagement.userProfile.userSettings.theme"
              defaultMessage="Mode"
            />
          </FormLabel>
        }
        fullWidth
      >
        <EuiButtonGroup
          legend={i18n.translate(
            'xpack.security.accountManagement.userProfile.userSettings.themeGroupDescription',
            {
              defaultMessage: 'Elastic theme',
            }
          )}
          buttonSize="m"
          data-test-subj="darkModeButton"
          idSelected={idSelected}
          isDisabled={isThemeOverridden}
          options={[
            {
              id: '',
              label: (
                <FormattedMessage
                  id="xpack.security.accountManagement.userProfile.defaultModeButton"
                  defaultMessage="Space default"
                />
              ),
            },
            {
              id: 'light',
              label: (
                <FormattedMessage
                  id="xpack.security.accountManagement.userProfile.lightModeButton"
                  defaultMessage="Light"
                />
              ),
              iconType: 'sun',
            },
            {
              id: 'dark',
              label: (
                <FormattedMessage
                  id="xpack.security.accountManagement.userProfile.darkModeButton"
                  defaultMessage="Dark"
                />
              ),
              iconType: 'moon',
            },
          ]}
          onChange={(id: string) => formik.setFieldValue('data.userSettings.darkMode', id)}
          isFullWidth
        />
      </FormRow>
    </EuiDescribedFormGroup>
  );
}

function UserAvatarEditor({
  user,
  formik,
}: {
  user: AuthenticatedUser;
  formik: ReturnType<typeof useUserProfileForm>;
}) {
  const { euiTheme } = useEuiTheme();
  if (!formik.values.data) {
    return null;
  }

  const isReservedUser = isUserReserved(user);
  return (
    <EuiDescribedFormGroup
      fullWidth
      fieldFlexItemProps={{ style: { alignSelf: 'flex-start' } }}
      title={
        <h2>
          <FormattedMessage
            id="xpack.security.accountManagement.userProfile.avatarGroupTitle"
            defaultMessage="Avatar"
          />
        </h2>
      }
      description={
        <FormattedMessage
          id="xpack.security.accountManagement.userProfile.avatarGroupDescription"
          defaultMessage="Provide your initials or upload an image to represent yourself."
        />
      }
    >
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          {formik.values.avatarType === 'image' && !formik.values.data.avatar.imageUrl ? (
            <UserAvatar size="xl" />
          ) : (
            <UserAvatar
              user={{
                username: user.username,
                full_name: formik.values.user.full_name,
              }}
              avatar={{
                imageUrl:
                  formik.values.avatarType === 'image'
                    ? formik.values.data.avatar.imageUrl
                    : undefined,
                initials: formik.values.data.avatar.initials || '?',
                color: VALID_HEX_COLOR.test(formik.values.data.avatar.color)
                  ? formik.values.data.avatar.color
                  : undefined,
              }}
              size="xl"
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <FormRow
            name="avatarType"
            label={
              <FormLabel for="avatarType">
                <FormattedMessage
                  id="xpack.security.accountManagement.userProfile.avatarTypeGroupDescription"
                  defaultMessage="Avatar type"
                />
              </FormLabel>
            }
            fullWidth
          >
            <EuiButtonGroup
              legend={i18n.translate(
                'xpack.security.accountManagement.userProfile.avatarTypeGroupDescription',
                { defaultMessage: 'Avatar type' }
              )}
              buttonSize="m"
              idSelected={formik.values.avatarType}
              options={[
                {
                  id: 'initials',
                  label: (
                    <FormattedMessage
                      id="xpack.security.accountManagement.userProfile.initialsAvatarTypeLabel"
                      defaultMessage="Initials"
                    />
                  ),
                },
                {
                  id: 'image',
                  label: (
                    <FormattedMessage
                      id="xpack.security.accountManagement.userProfile.imageAvatarTypeLabel"
                      defaultMessage="Image"
                    />
                  ),
                  iconType: 'image',
                },
              ]}
              onChange={(id: string) => formik.setFieldValue('avatarType', id)}
              isFullWidth
            />
          </FormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />

      {formik.values.avatarType === 'image' ? (
        <FormRow
          label={
            <FormLabel for="data.avatar.imageUrl">
              <FormattedMessage
                id="xpack.security.accountManagement.userProfile.imageUrlLabel"
                defaultMessage="Image"
              />
            </FormLabel>
          }
          fullWidth
        >
          <FormField
            as={EuiFilePicker}
            name="data.avatar.imageUrl"
            value={undefined} /* EuiFilePicker breaks if value is provided  */
            initialPromptText={
              formik.values.data.avatar.imageUrl ? (
                <FormattedMessage
                  id="xpack.security.accountManagement.userProfile.prepopulatedImageUrlPromptText"
                  defaultMessage="Select or drag and drop a replacement image"
                />
              ) : (
                <FormattedMessage
                  id="xpack.security.accountManagement.userProfile.imageUrlPromptText"
                  defaultMessage="Select or drag and drop an image"
                />
              )
            }
            onChange={createImageHandler((imageUrl) => {
              formik.setFieldValue('data.avatar.imageUrl', imageUrl ?? '');
            })}
            validate={{
              required: i18n.translate(
                'xpack.security.accountManagement.userProfile.imageUrlRequiredError',
                { defaultMessage: 'Upload an image.' }
              ),
            }}
            accept={IMAGE_FILE_TYPES.join(',')}
            display="default"
            fullWidth
          />
        </FormRow>
      ) : (
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem grow={false} style={{ width: 64 }}>
            <FormRow
              label={
                <FormLabel for="data.avatar.initials">
                  <FormattedMessage
                    id="xpack.security.accountManagement.userProfile.initialsLabel"
                    defaultMessage="Initials"
                  />
                </FormLabel>
              }
              fullWidth
            >
              <FormField
                name="data.avatar.initials"
                maxLength={2}
                validate={{
                  required: i18n.translate(
                    'xpack.security.accountManagement.userProfile.initialsRequiredError',
                    { defaultMessage: 'Add initials' }
                  ),
                  maxLength: {
                    value: 2,
                    message: i18n.translate(
                      'xpack.security.accountManagement.userProfile.initialsMaxLengthError',
                      { defaultMessage: 'Enter no more than 2 characters.' }
                    ),
                  },
                }}
                fullWidth
              />
            </FormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <FormRow
              label={
                <FormLabel for="data.avatar.color">
                  <FormattedMessage
                    id="xpack.security.accountManagement.userProfile.colorLabel"
                    defaultMessage="Color"
                  />
                </FormLabel>
              }
              labelAppend={
                !isReservedUser ? (
                  <EuiButtonEmpty
                    onClick={() => formik.setFieldValue('data.avatar.color', getRandomColor())}
                    size="xs"
                    flush="right"
                    style={{ height: euiTheme.base }}
                  >
                    <FormattedMessage
                      id="xpack.security.accountManagement.userProfile.randomizeButton"
                      defaultMessage="Randomize"
                    />
                  </EuiButtonEmpty>
                ) : null
              }
              fullWidth
            >
              <FormField
                as={EuiColorPicker}
                name="data.avatar.color"
                color={formik.values.data.avatar.color}
                validate={{
                  required: i18n.translate(
                    'xpack.security.accountManagement.userProfile.colorRequiredError',
                    { defaultMessage: 'Select a color.' }
                  ),
                  pattern: {
                    value: VALID_HEX_COLOR,
                    message: i18n.translate(
                      'xpack.security.accountManagement.userProfile.colorPatternError',
                      { defaultMessage: 'Enter a valid HEX color code.' }
                    ),
                  },
                }}
                onChange={(value: string) => {
                  formik.setFieldValue('data.avatar.color', value);
                }}
                fullWidth
              />
            </FormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiDescribedFormGroup>
  );
}

function UserPasswordEditor({
  user,
  onShowPasswordForm,
}: {
  user: AuthenticatedUser;
  onShowPasswordForm: () => void;
}) {
  const canChangePassword = canUserChangePassword(user);
  if (!canChangePassword) {
    return null;
  }

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <h2>
          <FormattedMessage
            id="xpack.security.accountManagement.userProfile.passwordGroupTitle"
            defaultMessage="Password"
          />
        </h2>
      }
      description={
        <FormattedMessage
          id="xpack.security.accountManagement.userProfile.passwordGroupDescription"
          defaultMessage="Protect your data with a strong password."
        />
      }
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.security.accountManagement.userProfile.passwordLabel"
            defaultMessage="Password"
          />
        }
        fullWidth
      >
        <EuiButton
          onClick={onShowPasswordForm}
          iconType="lock"
          data-test-subj="openChangePasswordForm"
        >
          <FormattedMessage
            id="xpack.security.accountManagement.userProfile.changePasswordButton"
            defaultMessage="Change password"
          />
        </EuiButton>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
}

export const UserProfile: FunctionComponent<UserProfileProps> = ({ user, data }) => {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana<CoreStart>();
  const formik = useUserProfileForm({ user, data });
  const formChanges = useFormChanges();
  const titleId = useGeneratedHtmlId();
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);

  const canChangeDetails = canUserChangeDetails(user, services.application.capabilities);

  const isCloudUser = user.elastic_cloud_user;

  const { isThemeOverridden, isOverriddenThemeDarkMode } = determineIfThemeOverridden(
    services.settings.client
  );

  const rightSideItems = [
    {
      title: (
        <FormattedMessage
          id="xpack.security.accountManagement.userProfile.usernameLabel"
          defaultMessage="Username"
        />
      ),
      description: user.username as string | undefined,
      helpText: (
        <FormattedMessage
          id="xpack.security.accountManagement.userProfile.usernameHelpText"
          defaultMessage="User name cannot be changed after account creation."
        />
      ),
      testSubj: 'username',
    },
  ];

  if (!canChangeDetails) {
    rightSideItems.push({
      title: (
        <FormattedMessage
          id="xpack.security.accountManagement.userProfile.fullNameLabel"
          defaultMessage="Full name"
        />
      ),
      description: user.full_name,
      helpText: (
        <FormattedMessage
          id="xpack.security.accountManagement.userProfile.fullNameHelpText"
          defaultMessage="Please contact an administrator to change your full name."
        />
      ),
      testSubj: 'full_name',
    });

    rightSideItems.push({
      title: (
        <FormattedMessage
          id="xpack.security.accountManagement.userProfile.emailLabel"
          defaultMessage="Email address"
        />
      ),
      description: user.email,
      helpText: (
        <FormattedMessage
          id="xpack.security.accountManagement.userProfile.emailHelpText"
          defaultMessage="Please contact an administrator to change your email address."
        />
      ),
      testSubj: 'email',
    });
  }

  return (
    <>
      <FormikProvider value={formik}>
        <FormChangesProvider value={formChanges}>
          <Breadcrumb
            text={i18n.translate('xpack.security.accountManagement.userProfile.title', {
              defaultMessage: 'Profile',
            })}
          >
            {showChangePasswordForm ? (
              <ChangePasswordModal
                username={user.username}
                onCancel={() => setShowChangePasswordForm(false)}
                onSuccess={() => setShowChangePasswordForm(false)}
              />
            ) : null}

            <EuiPageTemplate
              className="eui-fullHeight"
              pageHeader={{
                pageTitle: (
                  <FormattedMessage
                    id="xpack.security.accountManagement.userProfile.title"
                    defaultMessage="Profile"
                  />
                ),
                pageTitleProps: { id: titleId },
                rightSideItems: rightSideItems.reverse().map((item) => (
                  <EuiDescriptionList
                    textStyle="reverse"
                    listItems={[
                      {
                        title: (
                          <EuiText color={euiTheme.colors.darkestShade} size="s">
                            <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
                              <EuiFlexItem grow={false}>{item.title}</EuiFlexItem>
                              <EuiFlexItem grow={false} style={{ marginLeft: '0.33em' }}>
                                <EuiIconTip type="questionInCircle" content={item.helpText} />
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiText>
                        ),
                        description: (
                          <span data-test-subj={item.testSubj}>
                            {item.description || (
                              <EuiText color={euiTheme.colors.disabledText} size="s">
                                <FormattedMessage
                                  id="xpack.security.accountManagement.userProfile.noneProvided"
                                  defaultMessage="None provided"
                                />
                              </EuiText>
                            )}
                          </span>
                        ),
                      },
                    ]}
                    compressed
                  />
                )),
              }}
              bottomBar={formChanges.count > 0 ? <SaveChangesBottomBar /> : null}
              bottomBarProps={{ paddingSize: 'm', position: 'fixed' }}
              restrictWidth={1000}
            >
              <Form aria-labelledby={titleId}>
                <UserDetailsEditor user={user} />
                {isCloudUser ? null : <UserAvatarEditor user={user} formik={formik} />}
                <UserPasswordEditor
                  user={user}
                  onShowPasswordForm={() => setShowChangePasswordForm(true)}
                />
                {isCloudUser ? null : (
                  <UserSettingsEditor
                    formik={formik}
                    isThemeOverridden={isThemeOverridden}
                    isOverriddenThemeDarkMode={isOverriddenThemeDarkMode}
                  />
                )}
              </Form>
            </EuiPageTemplate>
          </Breadcrumb>
        </FormChangesProvider>
      </FormikProvider>
    </>
  );
};

export function useUserProfileForm({ user, data }: UserProfileProps) {
  const { services } = useKibana<CoreStart>();
  const { userProfiles, users } = useSecurityApiClients();

  const [initialValues, resetInitialValues] = useState<UserProfileFormValues>({
    user: {
      full_name: user.full_name || '',
      email: user.email || '',
    },
    data: data
      ? {
          avatar: {
            initials: data.avatar?.initials || getUserAvatarInitials(user),
            color: data.avatar?.color || getUserAvatarColor(user),
            imageUrl: data.avatar?.imageUrl || '',
          },
          userSettings: {
            darkMode: data.userSettings?.darkMode || '',
          },
        }
      : undefined,
    avatarType: data?.avatar?.imageUrl ? 'image' : 'initials',
  });

  const [validateOnBlurOrChange, setValidateOnBlurOrChange] = useState(false);

  const formik = useFormik<UserProfileFormValues>({
    onSubmit: async (values) => {
      const submitActions = [];
      if (canUserChangeDetails(user, services.application.capabilities)) {
        submitActions.push(
          users.saveUser({
            username: user.username,
            roles: user.roles,
            enabled: user.enabled,
            full_name: values.user.full_name,
            email: values.user.email,
          })
        );
      }

      // Update profile only if it's available for the current user.
      if (values.data) {
        submitActions.push(
          userProfiles.update(
            values.avatarType === 'image'
              ? values.data
              : { ...values.data, avatar: { ...values.data.avatar, imageUrl: null } }
          )
        );
      }

      if (submitActions.length === 0) {
        return;
      }

      try {
        await Promise.all(submitActions);
      } catch (error) {
        services.notifications.toasts.addError(error, {
          title: i18n.translate('xpack.security.accountManagement.userProfile.submitErrorTitle', {
            defaultMessage: "Couldn't update profile",
          }),
        });
        return;
      }

      let isRefreshRequired = false;
      if (initialValues.data?.userSettings.darkMode !== values.data?.userSettings.darkMode) {
        isRefreshRequired = true;
      }

      resetInitialValues(values);

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

      services.notifications.toasts.addSuccess(successToastInput, successToastOptions);
    },
    initialValues,
    enableReinitialize: true,
    validateOnBlur: validateOnBlurOrChange,
    validateOnChange: validateOnBlurOrChange,
  });

  // We perform _the first_ validation only when the user submits the form to make UX less annoying. But after the user
  // submits the form, the validation model changes to on blur/change (as the user's mindset has changed from completing
  // the form to correcting the form).
  if (formik.submitCount > 0 && !validateOnBlurOrChange) {
    setValidateOnBlurOrChange(true);
  } else if (formik.submitCount === 0 && validateOnBlurOrChange) {
    setValidateOnBlurOrChange(false);
  }

  const customAvatarInitials = useRef(
    !!data?.avatar?.initials && data.avatar?.initials !== getUserAvatarInitials(user)
  );

  useUpdateEffect(() => {
    if (!customAvatarInitials.current) {
      const defaultInitials = getUserAvatarInitials({
        username: user.username,
        full_name: formik.values.user.full_name,
      });
      formik.setFieldValue('data.avatar.initials', defaultInitials);
    }
  }, [formik.values.user.full_name]);

  useUpdateEffect(() => {
    if (!customAvatarInitials.current && formik.values.data) {
      const defaultInitials = getUserAvatarInitials({
        username: user.username,
        full_name: formik.values.user.full_name,
      });
      customAvatarInitials.current = formik.values.data.avatar.initials !== defaultInitials;
    }
  }, [formik.values.data?.avatar.initials]);

  return formik;
}

export const SaveChangesBottomBar: FunctionComponent = () => {
  const formik = useFormikContext();
  const { count } = useFormChangesContext();

  return (
    <EuiFlexGroup alignItems="center" style={{ width: '100%' }} responsive={false}>
      <EuiFlexItem>
        <EuiFlexGroup responsive={false} gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiIcon type="dot" color="success" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.security.accountManagement.userProfile.unsavedChangesMessage"
              defaultMessage="{count, plural, one {# unsaved change} other {# unsaved changes}}"
              values={{ count }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={formik.handleReset} color="ghost">
          <FormattedMessage
            id="xpack.security.accountManagement.userProfile.discardChangesButton"
            defaultMessage="Discard"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={formik.submitForm}
          isLoading={formik.isSubmitting}
          isDisabled={formik.submitCount > 0 && !formik.isValid}
          color="success"
          iconType="save"
          fill
        >
          <FormattedMessage
            id="xpack.security.accountManagement.userProfile.saveChangesButton"
            defaultMessage="{isSubmitting, select, true{Saving changes…} other{Save changes}}"
            values={{ isSubmitting: formik.isSubmitting }}
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

function renderHelpText(isOverridden: boolean) {
  if (isOverridden) {
    return (
      <EuiText size="xs">
        <FormattedMessage
          id="xpack.security.accountManagement.userProfile.overriddenMessage"
          defaultMessage="This setting is overridden by the Kibana server and can not be changed."
        />
      </EuiText>
    );
  }
}

function determineIfThemeOverridden(settingsClient: IUiSettingsClient): {
  isThemeOverridden: boolean;
  isOverriddenThemeDarkMode: boolean;
} {
  return {
    isThemeOverridden: settingsClient.isOverridden('theme:darkMode'),
    isOverriddenThemeDarkMode: settingsClient.get<boolean>('theme:darkMode'),
  };
}
