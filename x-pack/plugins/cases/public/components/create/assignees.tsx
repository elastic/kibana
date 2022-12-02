/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import React, { memo, useCallback, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFormRow,
  EuiLink,
  EuiSelectableListItem,
  EuiTextColor,
} from '@elastic/eui';
import type { UserProfileWithAvatar, UserProfile } from '@kbn/user-profile-components';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import type { FieldConfig, FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  UseField,
  getFieldValidityAndErrorMessage,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { MAX_ASSIGNEES_PER_CASE } from '../../../common/constants';
import type { CaseAssignees } from '../../../common/api';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { OptionalFieldLabel } from './optional_field_label';
import * as i18n from './translations';
import { bringCurrentUserToFrontAndSort } from '../user_profiles/sort';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import { getAllPermissionsExceptFrom } from '../../utils/permissions';
import { useIsUserTyping } from '../../common/use_is_user_typing';

interface Props {
  isLoading: boolean;
}

interface FieldProps {
  field: FieldHook;
  options: EuiComboBoxOptionOption[];
  isLoading: boolean;
  isDisabled: boolean;
  currentUserProfile?: UserProfile;
  selectedOptions: EuiComboBoxOptionOption[];
  setSelectedOptions: React.Dispatch<React.SetStateAction<EuiComboBoxOptionOption[]>>;
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
    const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

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

    const isCurrentUserSelected = Boolean(
      selectedOptions?.find((option) => option.value === currentUserProfile?.uid)
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
  const { owner: owners } = useCasesContext();
  const availableOwners = useAvailableCasesOwners(getAllPermissionsExceptFrom('delete'));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<EuiComboBoxOptionOption[]>();
  const { isUserTyping, onContentChange, onDebounce } = useIsUserTyping();
  const hasOwners = owners.length > 0;

  const { data: currentUserProfile, isLoading: isLoadingCurrentUserProfile } =
    useGetCurrentUserProfile();

  const {
    data: userProfiles,
    isLoading: isLoadingSuggest,
    isFetching: isFetchingSuggest,
  } = useSuggestUserProfiles({
    name: searchTerm,
    owners: hasOwners ? owners : availableOwners,
    onDebounce,
  });

  const options =
    bringCurrentUserToFrontAndSort(currentUserProfile, userProfiles)?.map((userProfile) =>
      userProfileToComboBoxOption(userProfile)
    ) ?? [];

  const onSearchComboChange = (value: string) => {
    if (!isEmpty(value)) {
      setSearchTerm(value);
    }

    onContentChange(value);
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
