/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, differenceWith } from 'lodash';
import React, { memo, useCallback, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiComboBox,
  EuiFormRow,
  EuiLink,
  EuiTextColor,
} from '@elastic/eui';
import type { UserProfileWithAvatar, UserProfile } from '@kbn/user-profile-components';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import type { FieldConfig, FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  UseField,
  getFieldValidityAndErrorMessage,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { CaseAssignees } from '../../../common/types/domain';
import { MAX_ASSIGNEES_PER_CASE } from '../../../common/constants';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { OptionalFieldLabel } from '../optional_field_label';
import * as i18n from '../create/translations';
import { bringCurrentUserToFrontAndSort } from '../user_profiles/sort';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import { getAllPermissionsExceptFrom } from '../../utils/permissions';
import { useIsUserTyping } from '../../common/use_is_user_typing';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';

const FIELD_ID = 'assignees';

interface Props {
  isLoading: boolean;
}

type UserProfileComboBoxOption = EuiComboBoxOptionOption<string> & UserProfileWithAvatar;

interface FieldProps {
  field: FieldHook<CaseAssignees>;
  options: UserProfileComboBoxOption[];
  isLoading: boolean;
  isDisabled: boolean;
  currentUserProfile?: UserProfile;
  onSearchComboChange: (value: string) => void;
}

const getConfig = (): FieldConfig<CaseAssignees> => ({
  label: i18n.ASSIGNEES,
  defaultValue: [],
  validations: [
    {
      validator: ({ value }) => {
        if (value.length > MAX_ASSIGNEES_PER_CASE) {
          return { message: i18n.INVALID_ASSIGNEES };
        }
      },
    },
  ],
});

const userProfileToComboBoxOption = (userProfile: UserProfileWithAvatar) => ({
  label: getUserDisplayName(userProfile.user),
  value: userProfile.uid,
  key: userProfile.uid,
  user: userProfile.user,
  data: userProfile.data,
});

const comboBoxOptionToAssignee = (option: EuiComboBoxOptionOption<string>) => ({
  uid: option.value ?? '',
});

const AssigneesFieldComponent: React.FC<FieldProps> = React.memo(
  ({ field, isLoading, isDisabled, options, currentUserProfile, onSearchComboChange }) => {
    const { setValue, value: selectedAssignees } = field;
    const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

    const selectedOptions: UserProfileComboBoxOption[] = selectedAssignees
      .map(({ uid }) => {
        const selectedUserProfile = options.find((userProfile) => userProfile.key === uid);

        if (selectedUserProfile) {
          return selectedUserProfile;
        }

        return null;
      })
      .filter((value): value is UserProfileComboBoxOption => value != null);

    const onComboChange = useCallback(
      (currentOptions: Array<EuiComboBoxOptionOption<string>>) => {
        setValue(currentOptions.map((option) => comboBoxOptionToAssignee(option)));
      },
      [setValue]
    );

    const onSelfAssign = useCallback(() => {
      if (!currentUserProfile) {
        return;
      }

      setValue([...selectedAssignees, { uid: currentUserProfile.uid }]);
    }, [currentUserProfile, selectedAssignees, setValue]);

    const renderOption = useCallback((option, searchValue: string, contentClassName: string) => {
      const { user, data } = option as UserProfileComboBoxOption;

      const displayName = getUserDisplayName(user);

      return (
        <EuiFlexGroup
          alignItems="center"
          justifyContent="flexStart"
          gutterSize="s"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <UserAvatar user={user} avatar={data.avatar} size="s" />
          </EuiFlexItem>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="none"
            responsive={false}
          >
            <EuiFlexItem>
              <EuiHighlight search={searchValue} className={contentClassName}>
                {displayName}
              </EuiHighlight>
            </EuiFlexItem>
            {user.email && user.email !== displayName ? (
              <EuiFlexItem grow={false}>
                <EuiTextColor color={'subdued'}>
                  <EuiHighlight search={searchValue} className={contentClassName}>
                    {user.email}
                  </EuiHighlight>
                </EuiTextColor>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexGroup>
      );
    }, []);

    const isCurrentUserSelected = Boolean(
      selectedAssignees?.find((assignee) => assignee.uid === currentUserProfile?.uid)
    );

    return (
      <EuiFormRow
        id="createCaseAssignees"
        fullWidth
        label={i18n.ASSIGNEES}
        labelAppend={OptionalFieldLabel}
        helpText={
          currentUserProfile ? (
            <EuiLink
              data-test-subj="create-case-assign-yourself-link"
              onClick={onSelfAssign}
              disabled={isCurrentUserSelected}
            >
              {i18n.ASSIGN_YOURSELF}
            </EuiLink>
          ) : undefined
        }
        isInvalid={isInvalid}
        error={errorMessage}
        data-test-subj="caseAssignees"
      >
        <EuiComboBox
          fullWidth
          async
          isLoading={isLoading}
          options={options}
          data-test-subj="createCaseAssigneesComboBox"
          selectedOptions={selectedOptions}
          isDisabled={isDisabled}
          onChange={onComboChange}
          onSearchChange={onSearchComboChange}
          renderOption={renderOption}
          rowHeight={35}
        />
      </EuiFormRow>
    );
  }
);

AssigneesFieldComponent.displayName = 'AssigneesFieldComponent';

const AssigneesComponent: React.FC<Props> = ({ isLoading: isLoadingForm }) => {
  const { owner: owners } = useCasesContext();
  const [{ assignees }] = useFormData<{ assignees?: CaseAssignees }>({ watch: [FIELD_ID] });
  const availableOwners = useAvailableCasesOwners(getAllPermissionsExceptFrom('delete'));
  const [searchTerm, setSearchTerm] = useState('');
  const { isUserTyping, onContentChange, onDebounce } = useIsUserTyping();
  const hasOwners = owners.length > 0;

  const { data: currentUserProfile, isLoading: isLoadingCurrentUserProfile } =
    useGetCurrentUserProfile();

  const {
    data: userProfiles = [],
    isLoading: isLoadingSuggest,
    isFetching: isFetchingSuggest,
  } = useSuggestUserProfiles({
    name: searchTerm,
    owners: hasOwners ? owners : availableOwners,
    onDebounce,
  });

  const assigneesWithoutProfiles = differenceWith(
    assignees ?? [],
    userProfiles ?? [],
    (assignee, userProfile) => assignee.uid === userProfile.uid
  );

  const { data: bulkUserProfiles = new Map(), isFetching: isLoadingBulkGetUserProfiles } =
    useBulkGetUserProfiles({ uids: assigneesWithoutProfiles.map((assignee) => assignee.uid) });

  const bulkUserProfilesAsArray = Array.from(bulkUserProfiles).map(([_, profile]) => profile);

  const options =
    bringCurrentUserToFrontAndSort(currentUserProfile, [
      ...userProfiles,
      ...bulkUserProfilesAsArray,
    ])?.map((userProfile) => userProfileToComboBoxOption(userProfile)) ?? [];

  const onSearchComboChange = (value: string) => {
    if (!isEmpty(value)) {
      setSearchTerm(value);
    }

    onContentChange(value);
  };

  const isLoading =
    isLoadingForm ||
    isLoadingCurrentUserProfile ||
    isLoadingBulkGetUserProfiles ||
    isLoadingSuggest ||
    isFetchingSuggest ||
    isUserTyping;

  const isDisabled = isLoadingForm || isLoadingCurrentUserProfile || isLoadingBulkGetUserProfiles;

  return (
    <UseField
      path={FIELD_ID}
      config={getConfig()}
      component={AssigneesFieldComponent}
      componentProps={{
        isLoading,
        isDisabled,
        options,
        onSearchComboChange,
        currentUserProfile,
        isUserTyping,
      }}
    />
  );
};

AssigneesComponent.displayName = 'AssigneesComponent';

export const Assignees = memo(AssigneesComponent);
