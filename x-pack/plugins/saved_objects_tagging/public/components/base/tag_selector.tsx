/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo, useCallback } from 'react';
import { EuiComboBox, EuiHealth, EuiHighlight, EuiComboBoxOptionOption } from '@elastic/eui';
import { Tag } from '../../../common';

type TagComboBoxOptions = EuiComboBoxOptionOption<Tag>;

// we may need to add some props to pass down to EuiComboBox such as fullWidth or className
// but it was not necessary for the initial usages.
export interface TagSelectorProps {
  tags: Tag[];
  selected: string[];
  setSelected: (ids: string[]) => void;
  'data-test-subj'?: string;
}

const renderTagOption = (
  option: TagComboBoxOptions,
  searchValue: string,
  contentClassName: string
) => {
  const { id, name, color } = option.value ?? { name: '' };
  return (
    <EuiHealth color={color} data-test-subj={`tagSelectorOption-${id}`}>
      <span className={contentClassName}>
        <EuiHighlight search={searchValue}>{name}</EuiHighlight>
      </span>
    </EuiHealth>
  );
};

export const TagSelector: FC<TagSelectorProps> = ({
  tags,
  selected,
  setSelected,
  ...otherProps
}) => {
  const options = useMemo(() => {
    return tags.map((tag) => ({
      label: tag.name,
      color: tag.color,
      value: tag,
    }));
  }, [tags]);

  const selectedOptions = useMemo(() => {
    return options.filter((option) => selected.includes(option.value.id));
  }, [selected, options]);

  const onChange = useCallback(
    (newSelectedOptions: TagComboBoxOptions[]) => {
      const selectedIds = newSelectedOptions.map((option) => option.value!.id);
      setSelected(selectedIds);
    },
    [setSelected]
  );

  return (
    <EuiComboBox
      placeholder={''}
      options={options}
      selectedOptions={selectedOptions}
      onChange={onChange}
      renderOption={renderTagOption}
      {...otherProps}
    />
  );
};
