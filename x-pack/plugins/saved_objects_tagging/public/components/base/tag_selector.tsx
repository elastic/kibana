/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo, useCallback, useState } from 'react';
import {
  EuiComboBox,
  EuiHealth,
  EuiHighlight,
  EuiComboBoxOptionOption,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Tag } from '../../../common';
import { testSubjFriendly } from '../../utils';
import { CreateModalOpener } from '../edition_modal';

interface CreateOption {
  type: '__create_option__';
}

const createOptionValue: CreateOption = {
  type: '__create_option__',
};

type TagComboBoxOption = EuiComboBoxOptionOption<Tag | CreateOption>;

function isTagOption(option: TagComboBoxOption): option is EuiComboBoxOptionOption<Tag> {
  const value = option.value as Tag;
  return value.name !== undefined && value.color !== undefined && value.id !== undefined;
}

function isCreateOption(
  option: TagComboBoxOption
): option is EuiComboBoxOptionOption<CreateOption> {
  const value = option.value as CreateOption;
  return value.type === '__create_option__';
}

export interface TagSelectorProps {
  tags: Tag[];
  selected: string[];
  onTagsSelected: (ids: string[]) => void;
  'data-test-subj'?: string;
  allowCreate: boolean;
  openCreateModal: CreateModalOpener;
}

const renderCreateOption = () => {
  return (
    <EuiFlexGroup
      data-test-subj={`tagSelectorOption-action__create`}
      gutterSize="xs"
      alignItems="center"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type="tag" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <span>
          <FormattedMessage
            id="xpack.savedObjectsTagging.components.tagSelector.createTagOptionLabel"
            defaultMessage="Create tag"
          />
        </span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const renderTagOption = (
  option: EuiComboBoxOptionOption<Tag>,
  searchValue: string,
  contentClassName: string
) => {
  const { name, color } = option.value ?? { name: '' };
  return (
    <EuiHealth color={color} data-test-subj={`tagSelectorOption-${testSubjFriendly(name)}`}>
      <span className={contentClassName}>
        <EuiHighlight search={searchValue}>{name}</EuiHighlight>
      </span>
    </EuiHealth>
  );
};

const renderOption = (option: TagComboBoxOption, searchValue: string, contentClassName: string) => {
  if (isCreateOption(option)) {
    return renderCreateOption();
  }
  // just having an if/else block is not enough for TS to infer the type in the else block. strange...
  if (isTagOption(option)) {
    return renderTagOption(option, searchValue, contentClassName);
  }
};

export const TagSelector: FC<TagSelectorProps> = ({
  tags,
  selected,
  onTagsSelected,
  allowCreate,
  openCreateModal,
  ...otherProps
}) => {
  const [currentSearch, setCurrentSearch] = useState('');

  // We are forcing the 'create tag' option to always appear by having its
  // label matching the current search term. This is a workaround to address
  // the 'limitations' of the combobox that does not allow that feature
  // out of the box
  const createTagOption = useMemo(() => {
    // label and color will never be actually used for rendering.
    // label will only be used to check if the option matches the search,
    // which will always be true because we set its value to the current search.
    // The extra whitespace is required to avoid the combobox to consider that the value
    // is selected when closing the dropdown
    return {
      label: `${currentSearch} `,
      color: '#FFFFFF',
      value: createOptionValue,
    };
  }, [currentSearch]);

  // we append the 'create' option if user is allowed to create tags
  const options: TagComboBoxOption[] = useMemo(() => {
    return [
      ...tags.map((tag) => ({
        label: tag.name,
        color: tag.color,
        value: tag,
      })),
      ...(allowCreate ? [createTagOption] : []),
    ];
  }, [allowCreate, tags, createTagOption]);

  const selectedOptions = useMemo(() => {
    return options.filter((option) => isTagOption(option) && selected.includes(option.value!.id));
  }, [selected, options]);

  const onChange = useCallback(
    (newSelectedOptions: TagComboBoxOption[]) => {
      // when clicking on the 'create' option, it is selected.
      // we need to remove it from the selection and then open the
      // create modal instead.
      const tagOptions = newSelectedOptions.filter(isTagOption);
      const selectedIds = tagOptions.map((option) => option.value!.id);
      onTagsSelected(selectedIds);

      if (newSelectedOptions.find(isCreateOption)) {
        openCreateModal({
          defaultValues: {
            name: currentSearch,
          },
          onCreate: (tag) => {
            onTagsSelected([...selected, tag.id]);
          },
        });
      }
    },
    [selected, onTagsSelected, openCreateModal, currentSearch]
  );

  return (
    <EuiComboBox
      placeholder={''}
      options={options}
      selectedOptions={selectedOptions}
      onSearchChange={setCurrentSearch}
      onChange={onChange}
      renderOption={renderOption}
      {...otherProps}
    />
  );
};
