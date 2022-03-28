/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiColorPicker,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiPageTemplate,
  EuiSpacer,
  EuiSplitPanel,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { Form, FormikProvider, useFormik, useFormikContext } from 'formik';
import type { FunctionComponent } from 'react';
import React, { useRef, useState } from 'react';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from 'src/core/public';

import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import type { AuthenticatedUser, UserAvatar as IUserAvatar } from '../../../common';
import {
  canUserChangeDetails,
  canUserChangePassword,
  getUserAvatarColor,
  getUserAvatarInitials,
} from '../../../common/model';
import { Breadcrumb } from '../../components/breadcrumb';
import {
  FormChangesProvider,
  useFormChanges,
  useFormChangesContext,
} from '../../components/form_changes';
import { FormField } from '../../components/form_field';
import { FormLabel } from '../../components/form_label';
import { FormRow, OptionalText } from '../../components/form_row';
import { UserAPIClient } from '../../management/users';
import { ChangePasswordFlyout } from '../../management/users/edit_user/change_password_flyout';
import { isUserReserved } from '../../management/users/user_utils';
import { UserAvatar } from './user_avatar';
import { UserProfileAPIClient } from './user_profile_api_client';
import { createImageHandler, getRandomColor, IMAGE_FILE_TYPES, VALID_HEX_COLOR } from './utils';

export interface UserProfileProps {
  user: AuthenticatedUser;
  data: {
    avatar?: IUserAvatar;
  };
}

export interface UserProfileFormValues {
  user: {
    full_name: string;
    email: string;
  };
  data: {
    avatar: {
      initials: string;
      color: string;
      imageUrl: string;
    };
  };
  avatarType: 'initials' | 'image';
}

export const UserProfile: FunctionComponent<UserProfileProps> = ({ user, data }) => {
  const { services } = useKibana<CoreStart>();
  const formik = useUserProfileForm({ user, data });
  const formChanges = useFormChanges();
  const titleId = useGeneratedHtmlId();
  const [showDeleteFlyout, setShowDeleteFlyout] = useState(false);

  const isReservedUser = isUserReserved(user);
  const canChangePassword = canUserChangePassword(user);
  const canChangeDetails = canUserChangeDetails(user, services.application.capabilities);

  return (
    <FormikProvider value={formik}>
      <FormChangesProvider value={formChanges}>
        <Breadcrumb
          text={i18n.translate('xpack.security.accountManagement.userProfile.title', {
            defaultMessage: 'Profile',
          })}
        >
          {showDeleteFlyout ? (
            <ChangePasswordFlyout
              username={user.username}
              onCancel={() => setShowDeleteFlyout(false)}
            />
          ) : null}

          <EuiPageTemplate
            pageHeader={{
              pageTitle: (
                <FormattedMessage
                  id="xpack.security.accountManagement.userProfile.title"
                  defaultMessage="Profile"
                />
              ),
              pageTitleProps: { id: titleId },
              rightSideItems: [
                canChangePassword ? (
                  <EuiButton onClick={() => setShowDeleteFlyout(true)} iconType="lock" fill>
                    <FormattedMessage
                      id="xpack.security.accountManagement.userProfile.changePasswordButton"
                      defaultMessage="Change password"
                    />
                  </EuiButton>
                ) : (
                  <EuiToolTip
                    content={
                      <FormattedMessage
                        id="xpack.security.accountManagement.userProfile.reservedUserWarning"
                        defaultMessage="You can't change the password for this account."
                      />
                    }
                  >
                    <EuiButton iconType="lock" isDisabled fill>
                      <FormattedMessage
                        id="xpack.security.accountManagement.userProfile.changePasswordButton"
                        defaultMessage="Change password"
                      />
                    </EuiButton>
                  </EuiToolTip>
                ),
              ],
            }}
            bottomBar={formChanges.count > 0 ? <SaveChangesBottomBar /> : null}
            restrictWidth={900}
          >
            {isReservedUser ? (
              <>
                <EuiCallOut
                  title={
                    <FormattedMessage
                      id="xpack.security.accountManagement.userProfile.reservedUserWarning"
                      defaultMessage="This user is built in and only the password can be changed."
                    />
                  }
                  iconType="lock"
                />
                <EuiSpacer />
              </>
            ) : null}

            <Form aria-labelledby={titleId}>
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
                    defaultMessage="Provide basic information about yourself."
                  />
                }
              >
                {isReservedUser ? (
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.security.accountManagement.userProfile.usernameLabel"
                        defaultMessage="Username"
                      />
                    }
                    helpText={
                      !isReservedUser ? (
                        <FormattedMessage
                          id="xpack.security.accountManagement.userProfile.usernameDisabledHelpText"
                          defaultMessage="Username can't be changed once created."
                        />
                      ) : null
                    }
                    fullWidth
                    isDisabled
                  >
                    <EuiFieldText icon="user" value={user.username} fullWidth />
                  </EuiFormRow>
                ) : (
                  <>
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
                      isDisabled={!canChangeDetails}
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
                      isDisabled={!canChangeDetails}
                      fullWidth
                    >
                      <FormField type="email" name="user.email" fullWidth />
                    </FormRow>
                  </>
                )}
              </EuiDescribedFormGroup>

              <EuiDescribedFormGroup
                fullWidth
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
                    defaultMessage="Pick a color or photo to represent yourself."
                  />
                }
              >
                {!isReservedUser && (
                  <>
                    <EuiFormRow fullWidth>
                      <EuiKeyPadMenu
                        checkable={{
                          legend: (
                            <FormLabel for="avatarType">
                              <FormattedMessage
                                id="xpack.security.accountManagement.userProfile.avatarTypeGroupDescription"
                                defaultMessage="Avatar type"
                              />
                            </FormLabel>
                          ),
                        }}
                      >
                        <EuiKeyPadMenuItem
                          checkable="single"
                          name="avatarType"
                          label={
                            <FormattedMessage
                              id="xpack.security.accountManagement.userProfile.initialsAvatarTypeLabel"
                              defaultMessage="Initials"
                            />
                          }
                          onChange={() => formik.setFieldValue('avatarType', 'initials')}
                          isSelected={formik.values.avatarType === 'initials'}
                          isDisabled={isReservedUser}
                        >
                          <EuiIcon type="lettering" size="l" />
                        </EuiKeyPadMenuItem>
                        <EuiKeyPadMenuItem
                          checkable="single"
                          name="avatarType"
                          label={
                            <FormattedMessage
                              id="xpack.security.accountManagement.userProfile.imageAvatarTypeLabel"
                              defaultMessage="Image"
                            />
                          }
                          onChange={() => formik.setFieldValue('avatarType', 'image')}
                          isSelected={formik.values.avatarType === 'image'}
                          isDisabled={isReservedUser}
                        >
                          <EuiIcon type="image" size="l" />
                        </EuiKeyPadMenuItem>
                      </EuiKeyPadMenu>
                    </EuiFormRow>
                    <EuiSpacer />
                  </>
                )}

                <EuiSplitPanel.Outer direction="row" hasBorder>
                  <EuiSplitPanel.Inner grow={false} color="subdued">
                    {formik.values.avatarType === 'image' && !formik.values.data.avatar.imageUrl ? (
                      <UserAvatar size="xl" />
                    ) : (
                      <UserAvatar
                        user={{ username: user.username, full_name: formik.values.user.full_name }}
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
                  </EuiSplitPanel.Inner>
                  <EuiSplitPanel.Inner color="plain">
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
                        isDisabled={isReservedUser}
                        fullWidth
                      >
                        <FormField
                          as={EuiFilePicker}
                          name="data.avatar.imageUrl"
                          value={undefined} /* EuiFilePicker breaks if value is provided  */
                          initialPromptText={
                            <FormattedMessage
                              id="xpack.security.accountManagement.userProfile.imageUrlPromptText"
                              defaultMessage="Select image file"
                            />
                          }
                          onChange={createImageHandler((imageUrl) => {
                            formik.setFieldValue('data.avatar.imageUrl', imageUrl ?? '');
                          })}
                          validate={{
                            required: i18n.translate(
                              'xpack.security.accountManagement.userProfile.imageUrlRequiredError',
                              {
                                defaultMessage: 'Upload an image.',
                              }
                            ),
                          }}
                          accept={IMAGE_FILE_TYPES.join(',')}
                          display="default"
                          fullWidth
                        />
                      </FormRow>
                    ) : (
                      <>
                        <FormRow
                          label={
                            <FormLabel for="data.avatar.initials">
                              <FormattedMessage
                                id="xpack.security.accountManagement.userProfile.initialsLabel"
                                defaultMessage="Initials"
                              />
                            </FormLabel>
                          }
                          isDisabled={isReservedUser}
                          fullWidth
                        >
                          <FormField
                            name="data.avatar.initials"
                            validate={{
                              required: i18n.translate(
                                'xpack.security.accountManagement.userProfile.initialsRequiredError',
                                {
                                  defaultMessage: 'Enter initials.',
                                }
                              ),
                              maxLength: {
                                value: 2,
                                message: i18n.translate(
                                  'xpack.security.accountManagement.userProfile.initialsMaxLengthError',
                                  {
                                    defaultMessage: 'Enter no more than 2 characters.',
                                  }
                                ),
                              },
                            }}
                            fullWidth
                          />
                        </FormRow>

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
                                onClick={() =>
                                  formik.setFieldValue('data.avatar.color', getRandomColor())
                                }
                                size="xs"
                                flush="right"
                                style={{ height: 18 }}
                              >
                                <FormattedMessage
                                  id="xpack.security.accountManagement.userProfile.randomizeButton"
                                  defaultMessage="Randomize"
                                />
                              </EuiButtonEmpty>
                            ) : null
                          }
                          isDisabled={isReservedUser}
                          fullWidth
                        >
                          <FormField
                            as={EuiColorPicker}
                            name="data.avatar.color"
                            color={formik.values.data.avatar.color}
                            validate={{
                              required: i18n.translate(
                                'xpack.security.accountManagement.userProfile.colorRequiredError',
                                {
                                  defaultMessage: 'Select a color.',
                                }
                              ),
                              pattern: {
                                value: VALID_HEX_COLOR,
                                message: i18n.translate(
                                  'xpack.security.accountManagement.userProfile.colorPatternError',
                                  {
                                    defaultMessage: 'Enter a valid HEX color code.',
                                  }
                                ),
                              },
                            }}
                            onChange={(value: string) => {
                              formik.setFieldValue('data.avatar.color', value);
                            }}
                            fullWidth
                          />
                        </FormRow>
                      </>
                    )}
                  </EuiSplitPanel.Inner>
                </EuiSplitPanel.Outer>
              </EuiDescribedFormGroup>
            </Form>
            <EuiSpacer />
          </EuiPageTemplate>
        </Breadcrumb>
      </FormChangesProvider>
    </FormikProvider>
  );
};

export function useUserProfileForm({ user, data }: UserProfileProps) {
  const { services } = useKibana<CoreStart>();

  const [initialValues, resetInitialValues] = useState<UserProfileFormValues>({
    user: {
      full_name: user.full_name || '',
      email: user.email || '',
    },
    data: {
      avatar: {
        initials: data.avatar?.initials || getUserAvatarInitials(user),
        color: data.avatar?.color || getUserAvatarColor(user),
        imageUrl: data.avatar?.imageUrl || '',
      },
    },
    avatarType: data.avatar?.imageUrl ? 'image' : 'initials',
  });

  const formik = useFormik<UserProfileFormValues>({
    onSubmit: async (values) => {
      try {
        const canChangeDetails = canUserChangeDetails(user, services.application.capabilities);
        const promises = [
          new UserProfileAPIClient(services.http).update(
            values.avatarType === 'image'
              ? values.data
              : { ...values.data, avatar: { ...values.data.avatar, imageUrl: null } }
          ),
        ];
        if (canChangeDetails) {
          promises.push(
            new UserAPIClient(services.http).saveUser({
              username: user.username,
              roles: user.roles,
              enabled: user.enabled,
              full_name: values.user.full_name,
              email: values.user.email,
            })
          );
        }
        await Promise.all(promises);
        resetInitialValues(values);
        services.notifications.toasts.addSuccess(
          i18n.translate('xpack.spaces.management.customizeSpaceAvatar.initialsHelpText', {
            defaultMessage: 'Profile updated',
          })
        );
      } catch (error) {
        services.notifications.toasts.addError(error, {
          title: i18n.translate('xpack.spaces.management.customizeSpaceAvatar.initialsHelpText', {
            defaultMessage: "Couldn't update profile",
          }),
        });
      }
    },
    initialValues,
    enableReinitialize: true,
  });

  const customAvatarInitials = useRef(
    !!data.avatar?.initials && data.avatar?.initials !== getUserAvatarInitials(user)
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
    if (!customAvatarInitials.current) {
      const defaultInitials = getUserAvatarInitials({
        username: user.username,
        full_name: formik.values.user.full_name,
      });
      customAvatarInitials.current = formik.values.data.avatar.initials !== defaultInitials;
    }
  }, [formik.values.data.avatar.initials]);

  return formik;
}

export const SaveChangesBottomBar: FunctionComponent = () => {
  const formik = useFormikContext();
  const { count } = useFormChangesContext();

  return (
    <EuiFlexGroup alignItems="center">
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
        <EuiButtonEmpty onClick={formik.handleReset} color="ghost" iconType="cross">
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
