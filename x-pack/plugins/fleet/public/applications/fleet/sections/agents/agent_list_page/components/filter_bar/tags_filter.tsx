/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { EuiHorizontalRule } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  tags: string[];
  selectedTags: string[];
  onSelectedTagsChange: (selectedTags: string[]) => void;
}

export const TagsFilter: React.FunctionComponent<Props> = ({
  tags,
  selectedTags,
  onSelectedTagsChange,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const [isTagsFilterOpen, setIsTagsFilterOpen] = useState<boolean>(false);

  const addTagsFilter = (tag: string) => {
    onSelectedTagsChange([...selectedTags, tag]);
  };

  const removeTagsFilter = (tag: string) => {
    onSelectedTagsChange(selectedTags.filter((t) => t !== tag));
  };

  const getOptions = useCallback((): EuiSelectableOption[] => {
    return tags.map((tag) => ({
      label: tag,
      checked: selectedTags.includes(tag) ? 'on' : undefined,
      key: tag,
      'data-test-subj': 'agentList.tagFilterOption',
    }));
  }, [tags, selectedTags]);

  const [options, setOptions] = useState<EuiSelectableOption[]>(getOptions());

  useEffect(() => {
    setOptions(getOptions());
  }, [getOptions]);

  return (
    <EuiPopover
      ownFocus
      zIndex={Number(euiTheme.levels.header) - 1}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          onClick={() => setIsTagsFilterOpen(!isTagsFilterOpen)}
          isSelected={isTagsFilterOpen}
          hasActiveFilters={selectedTags.length > 0}
          numActiveFilters={selectedTags.length}
          numFilters={tags.length}
          disabled={tags.length === 0}
          data-test-subj="agentList.tagsFilter"
        >
          <FormattedMessage id="xpack.fleet.agentList.tagsFilterText" defaultMessage="Tags" />
        </EuiFilterButton>
      }
      isOpen={isTagsFilterOpen}
      closePopover={() => setIsTagsFilterOpen(false)}
      panelPaddingSize="none"
    >
      <EuiSelectable
        options={options as any}
        onChange={(newOptions: EuiSelectableOption[]) => {
          newOptions.forEach((option, index) => {
            if (option.checked !== options[index].checked) {
              const tag = option.key!;
              if (option.checked !== 'on') {
                removeTagsFilter(tag);
                return;
              } else {
                addTagsFilter(tag);
                return;
              }
            }
          });
          setOptions(newOptions);
        }}
        data-test-subj="agentList.agentPolicyFilterOptions"
        listProps={{
          paddingSize: 's',
          style: {
            minWidth: 140,
          },
        }}
      >
        {(list) => list}
      </EuiSelectable>
      <EuiHorizontalRule margin="none" />
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="error"
            color="danger"
            data-test-subj="agentList.tagFilterClearAllBtn"
            onClick={() => {
              onSelectedTagsChange([]);
            }}
          >
            <FormattedMessage
              id="xpack.fleet.agentList.tagsFilterClearAllBtnText"
              defaultMessage="Clear all"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
