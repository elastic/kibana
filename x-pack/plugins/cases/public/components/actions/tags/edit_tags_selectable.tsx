/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiSelectable,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiIcon,
  EuiSelectableOption,
  EuiHighlight,
} from '@elastic/eui';

import { Case } from '../../../../common';
import * as i18n from './translations';
import { TagsSelectionState } from './types';

interface Props {
  selectedCases: Case[];
  tags: string[];
  isLoading: boolean;
  onChangeTags: (args: TagsSelectionState) => void;
}

const createTagsCounterMapping = (selectedCases: Case[]) => {
  const counterMap = new Map<string, number>();

  for (const theCase of selectedCases) {
    const caseTags = theCase.tags;

    for (const tag of caseTags) {
      counterMap.set(tag, (counterMap.get(tag) ?? 0) + 1);
    }
  }

  return counterMap;
};

const getSelectionIcon = ({
  option,
  totalCases,
  tagCounterMap,
  dirtyTags,
}: {
  option: EuiSelectableOption;
  totalCases: number;
  tagCounterMap: Map<string, number>;
  dirtyTags: Record<string, boolean>;
}) => {
  const tagCounter = tagCounterMap.get(option.label) ?? 0;

  if (totalCases === 0) {
    return <EuiIcon type="empty" />;
  }

  if (dirtyTags[option.label]) {
    return <EuiIcon type={option.checked === 'on' ? 'check' : 'empty'} />;
  }

  if (tagCounter === totalCases) {
    return <EuiIcon type="check" />;
  }

  if (tagCounter < totalCases && tagCounter !== 0) {
    return <EuiIcon type="asterisk" />;
  }

  return <EuiIcon type="empty" />;
};

const initTagsState = ({
  tags,
  totalCases,
  tagCounterMap,
}: {
  tags: string[];
  totalCases: number;
  tagCounterMap: Map<string, number>;
}): {
  options: EuiSelectableOption[];
  dirtyTags: Record<string, boolean>;
  selectedTags: string[];
} => {
  const options: EuiSelectableOption[] = [];
  const dirtyTags: Record<string, boolean> = {};
  const selectedTags: string[] = [];

  for (const tag of tags) {
    const tagCounter = tagCounterMap.get(tag) ?? 0;
    const isTagsInAllCases = tagCounter === totalCases;
    options.push({ label: tag, key: tag, ...(isTagsInAllCases ? { checked: 'on' } : {}) });

    if (isTagsInAllCases) {
      dirtyTags[tag] = true;
      selectedTags.push(tag);
    }
  }

  return { options, dirtyTags, selectedTags };
};

const EditTagsSelectableComponent: React.FC<Props> = ({
  selectedCases,
  tags,
  isLoading,
  onChangeTags,
}) => {
  const tagCounterMap = useMemo(() => createTagsCounterMapping(selectedCases), [selectedCases]);
  const initialState = useMemo(
    () => initTagsState({ tags, totalCases: selectedCases.length, tagCounterMap }),
    [selectedCases.length, tagCounterMap, tags]
  );

  const [dirtyTags, setDirtyTags] = useState<Record<string, boolean>>(initialState.dirtyTags);
  const [options, setOptions] = useState<EuiSelectableOption[]>(initialState.options);

  const renderOption = (option: EuiSelectableOption, searchValue: string) => {
    return (
      <>
        {getSelectionIcon({
          option,
          totalCases: selectedCases.length,
          tagCounterMap,
          dirtyTags,
        })}
        <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
      </>
    );
  };

  const onChange = (newOptions: EuiSelectableOption[]) => {
    const selectedTags: string[] = [];
    const unSelectedTags: string[] = [];

    for (const option of newOptions) {
      if (option.checked === 'on') {
        selectedTags.push(option.label);
      }

      if (!option.checked && dirtyTags[option.label]) {
        unSelectedTags.push(option.label);
      }
    }

    const newDirtyTags = selectedTags.reduce((acc, tag) => ({ ...acc, [tag]: true }), {});

    setDirtyTags((dirtyTagsRec) => ({ ...dirtyTagsRec, ...newDirtyTags }));
    onChangeTags({ selectedTags, unSelectedTags });
    setOptions(newOptions);
  };

  return (
    <EuiSelectable
      options={options}
      searchable
      searchProps={{ placeholder: i18n.SEARCH_PLACEHOLDER, isLoading, isClearable: !isLoading }}
      renderOption={renderOption}
      listProps={{ showIcons: false }}
      onChange={onChange}
    >
      {(list, search) => (
        <>
          {search}
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.TOTAL_TAGS(0)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup responsive={false}>
                <EuiButtonEmpty size="xs" flush="right">
                  {i18n.SELECT_ALL}
                </EuiButtonEmpty>
                <EuiButtonEmpty size="xs" flush="right">
                  {i18n.SELECT_NONE}
                </EuiButtonEmpty>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="m" />
          {list}
        </>
      )}
    </EuiSelectable>
  );
};

EditTagsSelectableComponent.displayName = 'EditTagsSelectable';

export const EditTagsSelectable = React.memo(EditTagsSelectableComponent);
