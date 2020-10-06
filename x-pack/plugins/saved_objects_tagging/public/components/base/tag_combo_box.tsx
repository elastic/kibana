/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo, useCallback } from 'react';
import { EuiComboBox, EuiHealth, EuiHighlight, EuiComboBoxOptionOption } from '@elastic/eui';
import { Tag } from '../../../common';

type TagComboBoxOptions = EuiComboBoxOptionOption<Tag>;

// TODO: add required props to pass down to EuiComboBox such as fullWidth, className, data-test-subj
export interface TagComboBoxProps {
  tags: Tag[];
  selected: string[];
  setSelected: (ids: string[]) => void;
}

const renderTagOption = (
  option: TagComboBoxOptions,
  searchValue: string,
  contentClassName: string
) => {
  const { title, color } = option.value ?? { title: '' };
  return (
    <EuiHealth color={color}>
      <span className={contentClassName}>
        <EuiHighlight search={searchValue}>{title}</EuiHighlight>
      </span>
    </EuiHealth>
  );
};

export const TagComboBox: FC<TagComboBoxProps> = ({ tags, selected, setSelected }) => {
  const options = useMemo(() => {
    return tags.map((tag) => ({
      label: tag.title,
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
    />
  );
};
