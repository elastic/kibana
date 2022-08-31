/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import React, { memo, useState } from 'react';
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
} from '@kbn/user-profile-components';
import { UseField, FieldConfig } from '../../common/shared_imports';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { OptionalFieldLabel } from './optional_field_label';
import * as i18n from './translations';

interface Props {
  isLoading: boolean;
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

const AssigneesComponent: React.FC<Props> = ({ isLoading: isLoadingForm }) => {
  const { owner } = useCasesContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<EuiComboBoxOptionOption[]>();
  const { data: currentUserProfile, isLoading: isLoadingCurrentUserProfile } =
    useGetCurrentUserProfile();

  const { data: userProfiles, isLoading: isLoadingSuggest } = useSuggestUserProfiles({
    name: searchTerm,
    owners: owner,
  });

  const options =
    userProfiles?.map((userProfile) => userProfileToComboBoxOption(userProfile)) ?? [];

  const onSearchComboChange = (value: string) => {
    if (!isEmpty(value)) {
      setSearchTerm(value);
    }
  };

  const isLoading = isLoadingForm || isLoadingCurrentUserProfile || isLoadingSuggest;

  const renderOption = (
    option: EuiComboBoxOptionOption,
    searchValue: string,
    contentClassName: string
  ) => {
    const { user, data, value } = option as EuiComboBoxOptionOption<string> & UserProfileWithAvatar;

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
  };

  return (
    <UseField path="assignees" config={getConfig()}>
      {(field) => {
        const { setValue } = field;

        const onComboChange = (currentOptions: EuiComboBoxOptionOption[]) => {
          setSelectedOptions(currentOptions);
          setValue(currentOptions.map((option) => comboBoxOptionToAssignee(option)));
        };

        const onSelfAssign = () => {
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
        };

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
              isDisabled={isLoading}
              onChange={onComboChange}
              onSearchChange={onSearchComboChange}
              renderOption={renderOption}
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};

AssigneesComponent.displayName = 'AssigneesComponent';

export const Assignees = memo(AssigneesComponent);
