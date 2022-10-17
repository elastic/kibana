/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useReducer, useState } from 'react';
import type { EuiSelectableOption, IconType } from '@elastic/eui';
import {
  EuiSelectable,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiIcon,
  EuiHighlight,
  EuiSelectableListItem,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { assertNever } from '@kbn/std';
import type { Case } from '../../../../common';
import * as i18n from './translations';
import type { TagsSelectionState } from './types';

interface Props {
  selectedCases: Case[];
  tags: string[];
  isLoading: boolean;
  onChangeTags: (args: TagsSelectionState) => void;
}

type TagSelectableOption = EuiSelectableOption<{ tagIcon: IconType }>;

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

interface Tag {
  tagState: TagState;
  dirty: boolean;
  icon: IconType;
}

interface State {
  tags: Record<string, Tag>;
  tagCounterMap: Map<string, number>;
}

const tagsReducer: React.Reducer<State, Action> = (state: State, action): State => {
  switch (action.type) {
    case Actions.CHECK_TAG:
      const selectedTags: State['tags'] = {};

      for (const tag of action.payload) {
        selectedTags[tag] = { tagState: TagState.CHECKED, dirty: true, icon: ICONS.CHECKED };
      }

      return { ...state, tags: { ...state.tags, ...selectedTags } };

    case Actions.UNCHECK_TAG:
      const unselectedTags: State['tags'] = {};

      for (const tag of action.payload) {
        unselectedTags[tag] = { tagState: TagState.UNCHECKED, dirty: true, icon: ICONS.UNCHECKED };
      }

      return { ...state, tags: { ...state.tags, ...unselectedTags } };

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
  const tagsRecord: State['tags'] = {};
  const state = { tags: tagsRecord, tagCounterMap };

  for (const tag of tags) {
    const tagCounter = tagCounterMap.get(tag) ?? 0;
    const isCheckedTag = tagCounter === totalCases;
    const isPartialTag = tagCounter < totalCases && tagCounter !== 0;
    const tagState = isCheckedTag
      ? TagState.CHECKED
      : isPartialTag
      ? TagState.PARTIAL
      : TagState.UNCHECKED;

    const icon = getSelectionIcon(tagState);

    tagsRecord[tag] = { tagState, dirty: isCheckedTag, icon };
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

const stateToOptions = (tagsState: State['tags']): TagSelectableOption[] => {
  const tags = Object.keys(tagsState);

  return tags.map((tag): EuiSelectableOption => {
    return {
      key: tag,
      label: tag,
      ...(tagsState[tag].tagState === TagState.CHECKED ? { checked: 'on' } : {}),
      data: { tagIcon: tagsState[tag].icon },
    };
  }) as TagSelectableOption[];
};

const getSelectionIcon = (tagState: TagState) => {
  return tagState === TagState.CHECKED
    ? ICONS.CHECKED
    : tagState === TagState.PARTIAL
    ? ICONS.PARTIAL
    : ICONS.UNCHECKED;
};

const NoMatchesMessage: React.FC<{ searchValue: string; onClick: (newTag: string) => void }> =
  React.memo(({ searchValue, onClick }) => {
    const onNewTagClick = useCallback(() => {
      onClick(searchValue);
    }, [onClick, searchValue]);

    return (
      <EuiSelectableListItem isFocused={false} showIcons={false} onClick={onNewTagClick}>
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
  const [state, dispatch] = useReducer(tagsReducer, { tags, selectedCases }, getInitialTagsState);
  const [searchValue, setSearchValue] = useState<string>();

  const options: TagSelectableOption[] = useMemo(() => stateToOptions(state.tags), [state.tags]);

  const renderOption = useCallback((option: TagSelectableOption, search: string) => {
    return (
      <>
        <EuiIcon type={option.tagIcon} />
        <EuiHighlight search={search}>{option.label}</EuiHighlight>
      </>
    );
  }, []);

  const onChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selectedTags: string[] = [];
      const unSelectedTags: string[] = [];

      for (const option of newOptions) {
        if (option.checked === 'on') {
          selectedTags.push(option.label);
        }

        if (!option.checked && state.tags[option.label].dirty) {
          unSelectedTags.push(option.label);
        }
      }

      dispatch({ type: Actions.CHECK_TAG, payload: selectedTags });
      dispatch({ type: Actions.UNCHECK_TAG, payload: unSelectedTags });
      onChangeTags({ selectedTags, unSelectedTags });
    },
    [onChangeTags, state.tags]
  );

  const onNewItem = useCallback(
    (newTag: string) => {
      setSearchValue(undefined);
      onChange([{ label: newTag, checked: 'on', key: newTag }, ...options]);
    },
    [onChange, options]
  );

  const onSelectAll = useCallback(() => {
    dispatch({ type: Actions.CHECK_TAG, payload: Object.keys(state.tags) });
    onChangeTags({ selectedTags: Object.keys(state.tags), unSelectedTags: [] });
  }, [onChangeTags, state.tags]);

  const onSelectNone = useCallback(() => {
    const unSelectedTags = [];

    for (const [label, tag] of Object.entries(state.tags)) {
      if (tag.tagState === TagState.CHECKED || tag.tagState === TagState.PARTIAL) {
        unSelectedTags.push(label);
      }
    }

    dispatch({ type: Actions.UNCHECK_TAG, payload: unSelectedTags });
    onChangeTags({ selectedTags: [], unSelectedTags });
  }, [state.tags, onChangeTags]);

  return (
    <EuiSelectable
      options={options}
      searchable
      searchProps={{
        placeholder: i18n.SEARCH_PLACEHOLDER,
        isLoading,
        isClearable: !isLoading,
        onChange: setSearchValue,
        value: searchValue,
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
