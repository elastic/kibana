/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import React, { memo, useCallback, useState } from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiLink,
  EuiSelectableListItem,
  EuiTextColor,
} from '@elastic/eui';
import {
  UserProfileWithAvatar,
  UserAvatar,
  getUserDisplayName,
  UserProfile,
} from '@kbn/user-profile-components';
import { UseField, FieldConfig, FieldHook } from '../../common/shared_imports';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { OptionalFieldLabel } from './optional_field_label';
import * as i18n from './translations';
import { bringCurrentUserToFrontAndSort } from '../user_profiles/sort';

interface Props {
  isLoading: boolean;
}

interface FieldProps {
  field: FieldHook;
  options: EuiComboBoxOptionOption[];
  isLoading: boolean;
  isDisabled: boolean;
  currentUserProfile: UserProfile;
  selectedOptions: EuiComboBoxOptionOption[];
  setSelectedOptions: React.Dispatch<React.SetStateAction<EuiComboBoxOptionOption[]>>;
  onSearchComboChange: (value: string) => void;
}

const getConfig = (): FieldConfig => ({
  label: i18n.ASSIGNEES,
  defaultValue: [],
});

const userProfileToComboBoxOption = (userProfile: UserProfileWithAvatar) => ({
  label: getUserDisplayName(userProfile.user),
  value: userProfile.uid,
  user: userProfile.user,
  data: userProfile.data,
});

const comboBoxOptionToAssignee = (option: EuiComboBoxOptionOption) => ({ uid: option.value });

const AssigneesFieldComponent: React.FC<FieldProps> = React.memo(
  ({
    field,
    isLoading,
    isDisabled,
    options,
    currentUserProfile,
    selectedOptions,
    setSelectedOptions,
    onSearchComboChange,
  }) => {
    const { setValue } = field;

    const onComboChange = useCallback(
      (currentOptions: EuiComboBoxOptionOption[]) => {
        setSelectedOptions(currentOptions);
        setValue(currentOptions.map((option) => comboBoxOptionToAssignee(option)));
      },
      [setSelectedOptions, setValue]
    );

    const onSelfAssign = useCallback(() => {
      if (!currentUserProfile) {
        return;
      }

      setSelectedOptions((prev) => [
        ...(prev ?? []),
        userProfileToComboBoxOption(currentUserProfile),
      ]);

      setValue([
        ...(selectedOptions?.map((option) => comboBoxOptionToAssignee(option)) ?? []),
        { uid: currentUserProfile.uid },
      ]);
    }, [currentUserProfile, selectedOptions, setSelectedOptions, setValue]);

    const renderOption = useCallback(
      (option: EuiComboBoxOptionOption, searchValue: string, contentClassName: string) => {
        const { user, data, value } = option as EuiComboBoxOptionOption<string> &
          UserProfileWithAvatar;

        return (
          <EuiSelectableListItem
            key={value}
            prepend={<UserAvatar user={user} avatar={data.avatar} size="s" />}
            className={contentClassName}
            append={<EuiTextColor color="subdued">{user.email}</EuiTextColor>}
          >
            {getUserDisplayName(user)}
          </EuiSelectableListItem>
        );
      },
      []
    );

    return (
      <EuiFormRow
        id="createCaseAssignees"
        fullWidth
        label={i18n.ASSIGNEES}
        labelAppend={OptionalFieldLabel}
        helpText={
          <EuiLink data-test-subj="create-case-assign-yourself-link" onClick={onSelfAssign}>
            {i18n.ASSIGN_YOURSELF}
          </EuiLink>
        }
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
        />
      </EuiFormRow>
    );
  }
);

AssigneesFieldComponent.displayName = 'AssigneesFieldComponent';

const AssigneesComponent: React.FC<Props> = ({ isLoading: isLoadingForm }) => {
  const { owner } = useCasesContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<EuiComboBoxOptionOption[]>();
  const [isUserTyping, setIsUserTyping] = useState(false);

  const { data: currentUserProfile, isLoading: isLoadingCurrentUserProfile } =
    useGetCurrentUserProfile();

  const onDebounce = useCallback(() => setIsUserTyping(false), []);

  const {
    data: userProfiles,
    isLoading: isLoadingSuggest,
    isFetching: isFetchingSuggest,
  } = useSuggestUserProfiles({
    name: searchTerm,
    owners: owner,
    onDebounce,
  });

  const options =
    bringCurrentUserToFrontAndSort(currentUserProfile, userProfiles)?.map((userProfile) =>
      userProfileToComboBoxOption(userProfile)
    ) ?? [];

  const onSearchComboChange = (value: string) => {
    setSearchTerm(value);

    if (!isEmpty(value)) {
      setIsUserTyping(true);
    }
  };

  const isLoading =
    isLoadingForm ||
    isLoadingCurrentUserProfile ||
    isLoadingSuggest ||
    isFetchingSuggest ||
    isUserTyping;

  const isDisabled = isLoadingForm || isLoadingCurrentUserProfile;

  return (
    <UseField
      path="assignees"
      config={getConfig()}
      component={AssigneesFieldComponent}
      componentProps={{
        isLoading,
        isDisabled,
        selectedOptions,
        setSelectedOptions,
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
