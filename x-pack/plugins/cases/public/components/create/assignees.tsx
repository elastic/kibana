/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiSelectableListItem,
  EuiTextColor,
} from '@elastic/eui';
import {
  UserProfileWithAvatar,
  UserAvatar,
  getUserDisplayName,
} from '@kbn/user-profile-components';
import React, { memo, useState } from 'react';
import { UseField, FieldConfig } from '../../common/shared_imports';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../cases_context/use_cases_context';
import { OptionalFieldLabel } from './optional_field_label';
import * as i18n from './translations';

interface Props {
  isLoading: boolean;
}

const getConfig = (): FieldConfig => ({
  label: i18n.ASSIGNEES,
  defaultValue: [],
});

const AssigneesComponent: React.FC<Props> = ({ isLoading }) => {
  const { owner } = useCasesContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<EuiComboBoxOptionOption[]>();

  const { data: userProfiles, isLoading: isLoadingSuggest } = useSuggestUserProfiles({
    name: searchTerm,
    owners: owner,
  });

  const options =
    userProfiles?.map((userProfile) => ({
      label: getUserDisplayName(userProfile.user),
      value: userProfile.uid,
      user: userProfile.user,
      data: userProfile.data,
    })) ?? [];

  const onComboChange = async (currentOptions: EuiComboBoxOptionOption[]) => {
    setSelectedOptions(currentOptions);
  };

  const onSearchComboChange = (value: string) => {
    setSearchTerm(value);
  };

  const renderOption = (
    option: EuiComboBoxOptionOption<UserProfileWithAvatar>,
    searchValue: string,
    contentClassName: string
  ) => {
    const { user, data } = option;
    return (
      <EuiSelectableListItem
        key={user.uid}
        prepend={<UserAvatar user={user} avatar={data.avatar} size="s" />}
        className={contentClassName}
        append={<EuiTextColor color="subdued">{user.email}</EuiTextColor>}
      />
    );
  };

  return (
    <UseField path="assignees" config={getConfig()}>
      {(field) => {
        return (
          <EuiFormRow
            id="createCaseAssignees"
            fullWidth
            label={i18n.ASSIGNEES}
            labelAppend={OptionalFieldLabel}
          >
            <EuiComboBox
              fullWidth
              async
              isLoading={isLoading || isLoadingSuggest}
              options={options}
              data-test-subj="createCaseAssigneesComboBox"
              selectedOptions={selectedOptions}
              isDisabled={isLoading || isLoadingSuggest}
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
