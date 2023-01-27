/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { toggleSelectedGroup } from '../../../../../common/components/ml_popover/jobs_table/filters/toggle_selected_group';
import { caseInsensitiveSort } from '../helpers';

const TAGS_POPOVER_WIDTH = 274;

interface TagsFilterPopoverProps {
  selectedTags: string[];
  tags: string[];
  onSelectedTagsChanged: (newTags: string[]) => void;
}

/**
 * Popover for selecting tags to filter on
 *
 * @param tags to display for filtering
 * @param onSelectedTagsChanged change listener to be notified when tag selection changes
 */
const TagsFilterPopoverComponent = ({
  tags,
  selectedTags,
  onSelectedTagsChanged,
}: TagsFilterPopoverProps) => {
  const sortedTags = useMemo(
    () => caseInsensitiveSort(Array.from(new Set([...tags, ...selectedTags]))),
    [selectedTags, tags]
  );
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>(() => {
    const selectedTagsSet = new Set(selectedTags);

    return sortedTags.map((label) => ({
      label,
      checked: selectedTagsSet.has(label) ? 'on' : undefined,
    }));
  });
  const handleSelectableOptionsChange = (
    newOptions: EuiSelectableOption[],
    _: unknown,
    changedOption: EuiSelectableOption
  ) => {
    setSelectableOptions(newOptions);
    toggleSelectedGroup(changedOption.label, selectedTags, onSelectedTagsChanged);
  };

  useEffect(() => {
    const selectedTagsSet = new Set(selectedTags);
    const newSelectableOptions: EuiSelectableOption[] = sortedTags.map((label) => ({
      label,
      checked: selectedTagsSet.has(label) ? 'on' : undefined,
    }));

    setSelectableOptions(newSelectableOptions);
  }, [sortedTags, selectedTags]);

  const triggerButton = (
    <EuiFilterButton
      grow
      iconType="arrowDown"
      onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
      numFilters={tags.length}
      isSelected={isTagPopoverOpen}
      hasActiveFilters={selectedTags.length > 0}
      numActiveFilters={selectedTags.length}
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
        searchable
        searchProps={{
          placeholder: 'Search tags',
        }}
        aria-label="Rules tag search"
        options={selectableOptions}
        onChange={handleSelectableOptionsChange}
        emptyMessage={i18n.NO_TAGS_AVAILABLE}
        noMatchesMessage={i18n.NO_TAGS_AVAILABLE}
      >
        {(list, search) => (
          <div style={{ width: TAGS_POPOVER_WIDTH }}>
            <EuiPopoverTitle>{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

TagsFilterPopoverComponent.displayName = 'TagsFilterPopoverComponent';

export const TagsFilterPopover = React.memo(TagsFilterPopoverComponent);

TagsFilterPopover.displayName = 'TagsFilterPopover';
