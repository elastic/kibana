/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useReducer, useState, useEffect } from 'react';
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
import { isEmpty } from 'lodash';
import type { Case } from '../../../../common';
import * as i18n from './translations';
import type { TagsSelectionState } from './types';

interface Props {
  selectedCases: Case[];
  tags: string[];
  isLoading: boolean;
  onChangeTags: (args: TagsSelectionState) => void;
}

type TagSelectableOption = EuiSelectableOption<{ tagIcon: IconType; newItem?: boolean }>;

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

/**
 * The EuiSelectable has two states values for its items: checked="on" for checked items
 * and check=undefined for unchecked items. Given that our use case needs
 * to track tags that are part in some cases and not part in some others we need
 * to keep our own state and sync it with the EuiSelectable. Our state is always
 * the source of true.
 *
 * In our state, a tag can be in one of the following states: checked, partial, and unchecked.
 * A checked tag is a tag that is either common in all cases or has been
 * checked by the user. A partial tag is a tag that is available is some of the
 * selected cases and not available in others. A user can not make a tag partial.
 * A unchecked tag is a tag that is either unselected by the user or is not available
 * in all selected cases.
 *
 * State transitions:
 *
 * partial --> checked
 * checked --> unchecked
 * unchecked --> checked
 *
 * A dirty tag is a tag that the user clicked. Because the EuiSelectable
 * returns all items (tags) on each user interaction we need to distinguish tags
 * that the user unselected from tags that are not common between all selected cases
 * and the user did not interact with them. Marking tags as dirty help us to do that.
 * A user to unselect a tag needs to fist checked a partial or an unselected tag and make it
 * selected (and dirty). This guarantees that unchecked tags will always become dirty at some
 * point in the past.
 *
 * On mount (initial state) the component gets all available tags.
 * The tags that are common in all selected cases are marked as checked
 * and dirty in our state and checked in EuiSelectable state.
 * The ones that are not common in any of the selected tags are
 * marked as unchecked and not dirty in our state and unchecked in EuiSelectable state.
 * The tags that are common in some of the cases are marked as partial and not dirty
 * in our state and unchecked in EuiSelectable state.
 *
 * When a user interacts with a tag the following happens:
 * a) If the tag is unchecked the EuiSelectable marks it as checked and
 * we change the state of the tag as checked and dirty.
 * b) If the tag is partial the EuiSelectable marks it as checked and
 * we change the state of the tag as checked and dirty.
 * c) If the tag is checked the EuiSelectable marks it as unchecked and
 * we change the state of the tag as unchecked and dirty.
 */

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
      'data-test-subj': `cases-actions-tags-edit-selectable-tag-${tag}`,
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

const getSelectedAndUnselectedTags = (newOptions: EuiSelectableOption[], tags: State['tags']) => {
  const selectedTags: string[] = [];
  const unSelectedTags: string[] = [];

  for (const option of newOptions) {
    if (option.checked === 'on') {
      selectedTags.push(option.label);
    }

    /**
     * User can only select the "Add new tag" item. Because a new item do not have a state yet
     * we need to ensure that state access is done only by options with state.
     */
    if (
      !option.data?.newItem &&
      !option.checked &&
      tags[option.label] &&
      tags[option.label].dirty
    ) {
      unSelectedTags.push(option.label);
    }
  }

  return { selectedTags, unSelectedTags };
};

const hasExactMatch = (searchValue: string, options: TagSelectableOption[]) => {
  return options.some((option) => option.key === searchValue);
};

const AddNewTagItem: React.FC<{ searchValue: string; onNewItem: (newTag: string) => void }> =
  React.memo(({ searchValue, onNewItem }) => {
    const onNewTagClick = useCallback(() => {
      onNewItem(searchValue);
    }, [onNewItem, searchValue]);

    return (
      <EuiSelectableListItem
        isFocused={false}
        showIcons={false}
        onClick={onNewTagClick}
        data-test-subj="cases-actions-tags-edit-selectable-add-new-tag"
      >
        <FormattedMessage
          id="xpack.cases.actions.tags.newTagMessage"
          defaultMessage="Add {searchValue} as a tag"
          values={{ searchValue: <b>{searchValue}</b> }}
        />
      </EuiSelectableListItem>
    );
  });

AddNewTagItem.displayName = 'AddNewTagItem';

const EditTagsSelectableComponent: React.FC<Props> = ({
  selectedCases,
  tags,
  isLoading,
  onChangeTags,
}) => {
  /**
   * If react query refetch on the background and fetches new tags the component will
   * rerender but it will not change the state. getInitialTagsState will run only on
   * mount. This is a desired behaviour because it prevents the list of tags for changing
   * while the user interacts with the selectable.
   */
  const [state, dispatch] = useReducer(tagsReducer, { tags, selectedCases }, getInitialTagsState);
  const [searchValue, setSearchValue] = useState<string>('');

  const options: TagSelectableOption[] = useMemo(() => stateToOptions(state.tags), [state.tags]);

  const renderOption = useCallback((option: TagSelectableOption, search: string) => {
    const dataTestSubj = option.newItem
      ? 'cases-actions-tags-edit-selectable-add-new-tag-icon'
      : `cases-actions-tags-edit-selectable-tag-${option.label}-icon-${option.tagIcon}`;

    return (
      <>
        <EuiIcon type={option.tagIcon} data-test-subj={dataTestSubj} />
        <EuiHighlight search={search}>{option.label}</EuiHighlight>
      </>
    );
  }, []);

  const onChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      /**
       * In this function the user has selected and deselected some tags. If the user
       * pressed the "add new tag" option it means that needs to add the new tag to the list.
       * Because the label of the "add new tag" item is "Add ${searchValue} as a tag" we need to
       * change the label to the same as the tag the user entered. The key will always be the
       * search term (aka the new label).
       */
      const normalizeOptions = newOptions.map((option) => {
        if (option.data?.newItem) {
          return {
            ...option,
            label: option.key ?? '',
          };
        }

        return option;
      });

      const { selectedTags, unSelectedTags } = getSelectedAndUnselectedTags(
        normalizeOptions,
        state.tags
      );

      dispatch({ type: Actions.CHECK_TAG, payload: selectedTags });
      dispatch({ type: Actions.UNCHECK_TAG, payload: unSelectedTags });
      onChangeTags({ selectedTags, unSelectedTags });
    },
    [onChangeTags, state.tags]
  );

  const onNewItem = useCallback(
    (newTag: string) => {
      const { selectedTags, unSelectedTags } = getSelectedAndUnselectedTags(options, state.tags);
      dispatch({ type: Actions.CHECK_TAG, payload: [newTag] });
      setSearchValue('');
      onChangeTags({ selectedTags: [...selectedTags, newTag], unSelectedTags });
    },
    [onChangeTags, options, state.tags]
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

  const onSearchChange = useCallback((value) => {
    setSearchValue(value);
  }, []);

  /**
   * TODO: Remove hack when PR https://github.com/elastic/eui/pull/6317
   * is merged and the new fix is merged into Kibana.
   *
   * This is a hack to force a rerender when
   * the user adds a new tag. There is a bug in
   * the EuiSelectable where a race condition that's causing the search bar
   * to not to match terms with the empty string to trigger the reload.
   * This means that when a user press the button to add a tag the
   * search bar clears but the options are not shown.
   */
  const [_, setRerender] = useState(0);

  useEffect(() => {
    if (isEmpty(searchValue)) {
      setRerender((x) => x + 1);
    }
  }, [options, setRerender, searchValue]);

  /**
   * While the user searches we need to add the ability
   * to add the search term as a new tag. The no matches message
   * is not enough because a search term can partial match to some tags
   * but the user will still need to add the search term as tag.
   * For that reason, we always add a "fake" option ("add new tag" option) which will serve as a
   * the button with which the user can add a new tag. We do not show
   * the "add new tag" option if there is an exact match.
   */
  const optionsWithAddNewTagOption = useMemo(() => {
    if (!isEmpty(searchValue) && !hasExactMatch(searchValue, options)) {
      return [
        {
          key: searchValue,
          searchableLabel: searchValue,
          label: `Add ${searchValue} as a tag`,
          'data-test-subj': 'cases-actions-tags-edit-selectable-add-new-tag',
          data: { tagIcon: 'empty', newItem: true },
        },
        ...options,
      ] as TagSelectableOption[];
    }

    return options;
  }, [options, searchValue]);

  return (
    <EuiSelectable
      options={optionsWithAddNewTagOption}
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
      noMatchesMessage={<AddNewTagItem searchValue={searchValue ?? ''} onNewItem={onNewItem} />}
      data-test-subj="cases-actions-tags-edit-selectable"
      height="full"
    >
      {(list, search) => (
        <>
          {search}
          <EuiSpacer size="s" />
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            responsive={false}
            direction="row"
            css={{ flexGrow: 0 }}
          >
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {i18n.TOTAL_TAGS(tags.length)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
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
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="m" />
          {/* <AddNewTagItem searchValue={searchValue} onNewItem={onNewItem} /> */}
          {list}
        </>
      )}
    </EuiSelectable>
  );
};

EditTagsSelectableComponent.displayName = 'EditTagsSelectable';

export const EditTagsSelectable = React.memo(EditTagsSelectableComponent);
