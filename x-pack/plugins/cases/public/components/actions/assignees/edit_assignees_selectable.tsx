/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiSelectable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiTextColor,
  EuiHighlight,
  useEuiTheme,
  EuiIcon,
} from '@elastic/eui';

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import type { Case } from '../../../../common';
import * as i18n from './translations';
import { useItemsState } from '../use_items_state';
import type { ItemSelectableOption, ItemsSelectionState } from '../types';

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
  // TODO: Include unknown users
  const userProfileIds = [...userProfiles.keys()];

  const toSelectableOption = useCallback(
    (item: string): AssigneeSelectableOption => {
      const userProfile = userProfiles.get(item);

      if (userProfile) {
        return {
          key: userProfile.uid,
          label: getUserDisplayName(userProfile.user),
          data: userProfile,
        } as unknown as AssigneeSelectableOption;
      }

      // TODO: Put unknown label
      return {
        key: item,
        label: item,
      } as AssigneeSelectableOption;
    },
    [userProfiles]
  );

  const { state, options, totalSelectedItems, onChange } = useItemsState({
    items: userProfileIds,
    selectedCases,
    fieldSelector: (theCase) => theCase.assignees.map(({ uid }) => uid),
    onChangeItems: onChangeAssignees,
    toSelectableOption,
  });
  const [searchValue, setSearchValue] = useState<string>('');
  const { euiTheme } = useEuiTheme();

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

  const onSearchChange = useCallback((value) => {
    setSearchValue(value);
  }, []);

  return (
    <EuiSelectable
      options={options}
      searchable
      searchProps={{
        placeholder: i18n.SEARCH_PLACEHOLDER,
        isLoading,
        isClearable: !isLoading,
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
      {(list, search) => (
        <>
          {search}
          {/* <EuiSpacer size="s" />
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            responsive={false}
            direction="row"
            css={{ flexGrow: 0 }}
            gutterSize="none"
          >
            <EuiFlexItem
              grow={false}
              css={{
                borderRight: euiTheme.border.thin,
                paddingRight: euiTheme.size.s,
              }}
            >
              <EuiText size="xs" color="subdued">
                {i18n.TOTAL_TAGS(tags.length)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              css={{
                paddingLeft: euiTheme.size.s,
              }}
            >
              <EuiText size="xs" color="subdued">
                {i18n.SELECTED_TAGS(totalSelectedItems)}
              </EuiText>
            </EuiFlexItem> */}
          {/* <EuiFlexItem grow={false} css={{ marginLeft: 'auto' }}>
              <EuiFlexGroup
                responsive={false}
                direction="row"
                alignItems="center"
                justifyContent="flexEnd"
                gutterSize="xs"
              >
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty size="xs" flush="right" onClick={onSelectAll}>
                    {i18n.SELECT_ALL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty size="xs" flush="right" onClick={onSelectNone}>
                    {i18n.SELECT_NONE}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem> */}
          {/* </EuiFlexGroup> */}
          <EuiHorizontalRule margin="m" />
          {list}
        </>
      )}
    </EuiSelectable>
  );
};

EditAssigneesSelectableComponent.displayName = 'EditAssigneesSelectable';

export const EditAssigneesSelectable = React.memo(EditAssigneesSelectableComponent);
