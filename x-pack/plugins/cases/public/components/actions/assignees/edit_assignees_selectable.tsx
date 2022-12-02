/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { isEmpty, sortBy } from 'lodash';
import {
  EuiSelectable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiTextColor,
  EuiHighlight,
  EuiIcon,
} from '@elastic/eui';

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import { useIsUserTyping } from '../../../common/use_is_user_typing';
import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import type { Case } from '../../../../common';
import * as i18n from './translations';
import { useItemsState } from '../use_items_state';
import type { ItemSelectableOption, ItemsSelectionState } from '../types';
import { useCasesContext } from '../../cases_context/use_cases_context';

interface Props {
  selectedCases: Case[];
  userProfiles: Map<string, UserProfileWithAvatar>;
  isLoading: boolean;
  onChangeAssignees: (args: ItemsSelectionState) => void;
}

type AssigneeSelectableOption = ItemSelectableOption<Partial<UserProfileWithAvatar>>;

const EditAssigneesSelectableComponent: React.FC<Props> = ({
  selectedCases,
  userProfiles,
  isLoading,
  onChangeAssignees,
}) => {
  const { owner: owners } = useCasesContext();
  const { isUserTyping, onContentChange, onDebounce } = useIsUserTyping();
  // TODO: Include unknown users
  const userProfileIds = [...userProfiles.keys()];

  const [searchValue, setSearchValue] = useState<string>('');
  const { data: searchResultUserProfiles, isLoading: isLoadingSuggest } = useSuggestUserProfiles({
    name: searchValue,
    owners,
    onDebounce,
  });

  const itemToSelectableOption = useCallback(
    (item: { key: string; data: Record<string, unknown> }): AssigneeSelectableOption => {
      // TODO: Fix types
      const userProfileFromData = item.data as unknown as UserProfileWithAvatar;
      const userProfile = isEmpty(userProfileFromData)
        ? userProfiles.get(item.key)
        : userProfileFromData;

      if (userProfile) {
        return toSelectableOption(userProfile);
      }

      const profileInSuggestedUsers = searchResultUserProfiles?.find(
        (profile) => profile.uid === item.data.uid
      );

      if (profileInSuggestedUsers) {
        return toSelectableOption(profileInSuggestedUsers);
      }

      // TODO: Put unknown label
      return {
        key: item.key,
        label: item.key,
      } as AssigneeSelectableOption;
    },
    [searchResultUserProfiles, userProfiles]
  );

  const { options, onChange } = useItemsState({
    items: userProfileIds,
    selectedCases,
    fieldSelector: (theCase) => theCase.assignees.map(({ uid }) => uid),
    onChangeItems: onChangeAssignees,
    itemToSelectableOption,
  });

  const finalOptions = getDisplayOptions({
    searchResultUserProfiles: searchResultUserProfiles ?? [],
    options,
    searchValue,
  });

  const isLoadingData = isLoading || isLoadingSuggest || isUserTyping;

  const renderOption = useCallback(
    (option: AssigneeSelectableOption, search: string) => {
      const dataTestSubj = `cases-actions-tags-edit-selectable-tag-${option.label}-icon-${option.itemIcon}`;

      if (!option.user) {
        return <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>;
      }

      return (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              justifyContent="center"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type={option.itemIcon} data-test-subj={dataTestSubj} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <UserAvatar user={option.user} avatar={option.data?.avatar} size="s" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem>
              <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
            </EuiFlexItem>
            {option.user.email && option.user.email !== option.label ? (
              <EuiFlexItem grow={false}>
                <EuiTextColor color={option.disabled ? 'disabled' : 'subdued'}>
                  {searchValue ? (
                    <EuiHighlight search={searchValue}>{option.user.email}</EuiHighlight>
                  ) : (
                    option.user.email
                  )}
                </EuiTextColor>
              </EuiFlexItem>
            ) : undefined}
          </EuiFlexGroup>
        </EuiFlexGroup>
      );
    },
    [searchValue]
  );

  const onSearchChange = useCallback(
    (value) => {
      setSearchValue(value);
      onContentChange(value);
    },
    [onContentChange]
  );

  return (
    <EuiSelectable
      options={finalOptions}
      searchable
      searchProps={{
        placeholder: i18n.SEARCH_PLACEHOLDER,
        isLoading: isLoadingData,
        isClearable: !isLoadingData,
        onChange: onSearchChange,
        value: searchValue,
        'data-test-subj': 'cases-actions-tags-edit-selectable-search-input',
      }}
      renderOption={renderOption}
      listProps={{ showIcons: false }}
      onChange={onChange}
      noMatchesMessage={'no match'}
      emptyMessage={'empty assignees'}
      data-test-subj="cases-actions-tags-edit-selectable"
      height="full"
    >
      {(list, search) => {
        return (
          <>
            {search}
            <EuiHorizontalRule margin="m" />
            {list}
          </>
        );
      }}
    </EuiSelectable>
  );
};

EditAssigneesSelectableComponent.displayName = 'EditAssigneesSelectable';

export const EditAssigneesSelectable = React.memo(EditAssigneesSelectableComponent);

const getDisplayOptions = ({
  searchResultUserProfiles,
  options,
  searchValue,
}: {
  searchResultUserProfiles: UserProfileWithAvatar[];
  options: AssigneeSelectableOption[];
  searchValue: string;
}) => {
  const searchResultsOptions =
    searchResultUserProfiles
      ?.filter((profile) => !options.find((option) => isMatchingOption(option, profile)))
      ?.map((profile) => toSelectableOption(profile)) ?? [];

  const [selectedOrPartialOptions, unselectedOptions] = options.reduce(
    (acc, option) => {
      // TODO fix type
      if (option?.data?.itemIcon !== 'empty') {
        acc[0].push(option);
      } else {
        acc[1].push(option);
      }

      return acc;
    },
    [[], []] as [AssigneeSelectableOption[], AssigneeSelectableOption[]]
  );

  const finalOptions = [
    ...sortOptionsAlphabetically(selectedOrPartialOptions),
    ...sortOptionsAlphabetically([...unselectedOptions, ...searchResultsOptions]),
  ];

  return finalOptions;
};

const sortOptionsAlphabetically = (options: AssigneeSelectableOption[]) =>
  /**
   * sortBy will not mutate the original array.
   * It will return a new sorted array
   *  */
  sortBy(options, (option) => option.label);

const toSelectableOption = (userProfile: UserProfileWithAvatar): AssigneeSelectableOption => {
  return {
    key: userProfile.uid,
    label: getUserDisplayName(userProfile.user),
    data: userProfile,
  } as unknown as AssigneeSelectableOption;
};

const isMatchingOption = <Option extends UserProfileWithAvatar | null>(
  option: AssigneeSelectableOption,
  profile: UserProfileWithAvatar
) => {
  return option.key === profile.uid;
};
