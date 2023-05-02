/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFilterButton,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
} from '@elastic/eui';
import { css } from '@emotion/react/dist/emotion-react.cjs';
import * as i18n from './translations';
import { caseInsensitiveSort } from '../rules_table/helpers';

const TAGS_POPOVER_WIDTH = 300;

export interface TagsFilterProps {
  selectedTags: EuiSelectableOption[];
  tags: string[];
  onSelectedTagsChanged: (newTags: string[]) => void;
}

/**
 * Filter component for selecting tags to filter against.
 * Supports inclusions, exclusions, floating selected items to the top, and global clearing
 *
 * @param tags to display for filtering
 * @param selectedTags
 * @param onSelectedTagsChanged change listener to be notified when tag selection changes
 */
const TagsFilterComponent: React.FC<TagsFilterProps> = ({
  tags,
  selectedTags,
  onSelectedTagsChanged,
}: TagsFilterProps) => {
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);

  // remove selected tags from tags list
  const selectedTagsStrings = selectedTags.map((t) => t.label);
  const tagsMinusSelection = tags.filter((t) => !selectedTagsStrings.includes(t));
  // sort selected tags
  const sortedSelectedTags = selectedTags.sort(({ label: a }, { label: b }) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  // sort tagsMinusSelection
  const sortedTags: EuiSelectableOption[] = useMemo(
    () =>
      caseInsensitiveSort(Array.from(new Set([...tagsMinusSelection]))).map((t) => ({ label: t })),
    [selectedTags, tags]
  );

  useEffect(() => {
    setOptions([...sortedSelectedTags, ...sortedTags]);
  }, [selectedTags]);

  // prepend selectedTags to tags
  const [options, setOptions] = useState<EuiSelectableOption[]>([
    ...sortedSelectedTags,
    ...sortedTags,
  ]);

  const areOptionsSelected = options.some((o) => o.checked != undefined);

  useEffect(() => {
    if (!isTagPopoverOpen) {
      onSelectedTagsChanged(options.filter((o) => o.checked === 'on').map((o) => o.label));
    }
  }, [isTagPopoverOpen]);

  const clearItems = useCallback(() => {
    setOptions(options.map((o) => ({ ...o, checked: undefined })));
  }, []);

  // const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>(() => {
  //   const selectedTagsSet = new Set(selectedTags);
  //
  //   return sortedTags.map((label) => ({
  //     label,
  //     checked: selectedTagsSet.has(label) ? 'on' : undefined,
  //   }));
  // });

  // const handleSelectableOptionsChange = (
  //   newOptions: EuiSelectableOption[],
  //   _: unknown,
  //   changedOption: EuiSelectableOption
  // ) => {
  //   setSelectableOptions(newOptions);
  //   toggleSelectedGroup(changedOption.label, selectedTags, onSelectedTagsChanged);
  // };

  // const onSelectionChange = useCallback(() => {}, []);

  // useEffect(() => {
  //   const selectedTagsSet = new Set(selectedTags);
  //   const newSelectableOptions: EuiSelectableOption[] = sortedTags.map((label) => ({
  //     label,
  //     checked: selectedTagsSet.has(label) ? 'on' : undefined,
  //   }));
  //
  //   setSelectableOptions(newSelectableOptions);
  // }, [sortedTags, selectedTags]);

  const triggerButton = (
    <EuiFilterButton
      grow
      iconType="arrowDown"
      onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
      isSelected={isTagPopoverOpen}
      numFilters={options.length}
      hasActiveFilters={!!options.find((option) => option.checked != null)}
      numActiveFilters={options.filter((option) => option.checked != null).length}
      data-test-subj="tags-filter-popover-button"
    >
      {i18n.TAGS}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isTagPopoverOpen}
      closePopover={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={{
        'data-test-subj': 'tags-filter-popover',
      }}
    >
      <EuiSelectable
        allowExclusions
        searchable
        searchProps={{
          placeholder: i18n.SEARCH_TAGS,
          compressed: true,
        }}
        aria-label={i18n.RULES_TAG_SEARCH}
        options={options}
        onChange={(newOptions) => setOptions(newOptions)}
        emptyMessage={i18n.NO_TAGS_AVAILABLE}
        noMatchesMessage={i18n.NO_TAGS_AVAILABLE}
      >
        {(list, search) => (
          <div style={{ width: TAGS_POPOVER_WIDTH }}>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
            <EuiPopoverFooter paddingSize="s">
              <EuiButtonEmpty
                onClick={clearItems}
                disabled={!areOptionsSelected}
                color={'danger'}
                iconType={'cross'}
                size="xs"
                css={css`
                  width: 100%;
                `}
              >
                {i18n.CLEAR_ALL}
              </EuiButtonEmpty>
            </EuiPopoverFooter>
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

export const TagsFilter = React.memo(TagsFilterComponent);
TagsFilter.displayName = 'TagsFilter';
