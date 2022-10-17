/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useReducer, useState } from 'react';
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
  EuiSelectableListItem,
  IconType,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { assertNever } from '@kbn/std';
import { Case } from '../../../../common';
import * as i18n from './translations';
import { TagsSelectionState } from './types';

interface Props {
  selectedCases: Case[];
  tags: string[];
  isLoading: boolean;
  onChangeTags: (args: TagsSelectionState) => void;
}

const enum TagState {
  CHECKED = 'checked',
  PARTIAL = 'partial',
  UNCHECKED = 'unchecked',
}

const enum Actions {
  CHECK_TAG,
  UNCHECK_TAG,
}

const enum ICONS {
  CHECKED = 'check',
  PARTIAL = 'asterisk',
  UNCHECKED = 'empty',
}

type Action =
  | { type: Actions.CHECK_TAG; payload: string[] }
  | { type: Actions.UNCHECK_TAG; payload: string[] };

type State = Record<string, { tagState: TagState; dirty: boolean; icon: IconType }>;

const tagsReducer: React.Reducer<State, Action> = (state: State, action): State => {
  switch (action.type) {
    case Actions.CHECK_TAG:
      return state;
    case Actions.UNCHECK_TAG:
      return state;

    default:
      assertNever(action);
  }
};

const getInitialTagsState = ({
  tags,
  selectedCases,
}: {
  tags: string[];
  selectedCases: Case[];
}): State => {
  const tagCounterMap = createTagsCounterMapping(selectedCases);
  const totalCases = selectedCases.length;
  const state: State = {};

  for (const tag of tags) {
    const tagCounter = tagCounterMap.get(tag) ?? 0;
    const isCheckedTag = tagCounter === totalCases;
    const isPartialTag = tagCounter < totalCases && tagCounter !== 0;
    const tagState = isCheckedTag
      ? TagState.CHECKED
      : isPartialTag
      ? TagState.PARTIAL
      : TagState.UNCHECKED;

    const icon = isCheckedTag ? ICONS.CHECKED : isPartialTag ? ICONS.PARTIAL : ICONS.UNCHECKED;

    state[tag] = { tagState, dirty: isCheckedTag, icon };

    return state;
  }

  return state;
};

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

const NoMatchesMessage: React.FC<{ searchValue: string; onClick: (newTag: string) => void }> =
  React.memo(({ searchValue, onClick }) => {
    const onNewTagClick = useCallback(() => onClick(searchValue), [onClick, searchValue]);

    return (
      <EuiSelectableListItem onFocusBadge showIcons={false} onClick={onNewTagClick}>
        <FormattedMessage
          id="xpack.cases.actions.tags.newTagMessage"
          defaultMessage="Add {searchValue} as a tag"
          values={{ searchValue: <b>{searchValue}</b> }}
        />
      </EuiSelectableListItem>
    );
  });

NoMatchesMessage.displayName = 'NoMatchesMessage';

const EditTagsSelectableComponent: React.FC<Props> = ({
  selectedCases,
  tags,
  isLoading,
  onChangeTags,
}) => {
  const [state, dispatch] = useReducer(tagsReducer, getInitialTagsState({ tags, selectedCases }));
  const tagCounterMap = useMemo(() => createTagsCounterMapping(selectedCases), [selectedCases]);
  const initialState = useMemo(
    () => initTagsState({ tags, totalCases: selectedCases.length, tagCounterMap }),
    [selectedCases.length, tagCounterMap, tags]
  );

  const [dirtyTags, setDirtyTags] = useState<Record<string, boolean>>(initialState.dirtyTags);
  const [options, setOptions] = useState<EuiSelectableOption[]>(initialState.options);
  const [searchValue, setSearchValue] = useState<string>();

  const renderOption = (option: EuiSelectableOption, search: string) => {
    return (
      <>
        {getSelectionIcon({
          option,
          totalCases: selectedCases.length,
          tagCounterMap,
          dirtyTags,
        })}
        <EuiHighlight search={search}>{option.label}</EuiHighlight>
      </>
    );
  };

  const onChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
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
    },
    [dirtyTags, onChangeTags]
  );

  const onNewItem = useCallback(
    (newTag: string) => {
      setSearchValue(undefined);
      onChange([{ label: newTag, checked: 'on', key: newTag }, ...options]);
    },
    [onChange, options]
  );

  const onSelectAll = useCallback(() => {
    onChange(options.map((option) => ({ ...option, checked: 'on' })));
  }, [onChange, options]);

  const onSelectNone = useCallback(() => {
    // TODO: Fix it
    const newDirtyTags = options.reduce((acc, option) => ({ ...acc, [option.label]: true }), {});

    setDirtyTags((dirtyTagsRec) => ({ ...dirtyTagsRec, ...newDirtyTags }));
    onChange(
      options.map((option) => {
        const { checked, ...rest } = option;
        return rest;
      })
    );
  }, [onChange, options]);

  return (
    <EuiSelectable
      options={options}
      searchable
      searchProps={{
        placeholder: i18n.SEARCH_PLACEHOLDER,
        isLoading,
        isClearable: !isLoading,
        onChange: setSearchValue,
      }}
      renderOption={renderOption}
      listProps={{ showIcons: false }}
      onChange={onChange}
      noMatchesMessage={<NoMatchesMessage searchValue={searchValue ?? ''} onClick={onNewItem} />}
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
                <EuiButtonEmpty size="xs" flush="right" onClick={onSelectAll}>
                  {i18n.SELECT_ALL}
                </EuiButtonEmpty>
                <EuiButtonEmpty size="xs" flush="right" onClick={onSelectNone}>
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
