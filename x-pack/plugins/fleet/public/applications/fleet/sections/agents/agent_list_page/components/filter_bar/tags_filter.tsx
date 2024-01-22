/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiHorizontalRule } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiSelectable,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

const ClearAllTagsEl = styled.span`
  padding: ${(props) => props.theme.eui.euiSizeS};
`;

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
  const [isTagsFilterOpen, setIsTagsFilterOpen] = useState<boolean>(false);

  const addTagsFilter = (tag: string) => {
    onSelectedTagsChange([...selectedTags, tag]);
  };

  const removeTagsFilter = (tag: string) => {
    onSelectedTagsChange(selectedTags.filter((t) => t !== tag));
  };

  const CLEAR_ALL = 'clear_all';

  const getOptions = useCallback((): EuiSelectableOption[] => {
    const clearAllOption: EuiSelectableOption = {
      label: CLEAR_ALL,
      key: CLEAR_ALL,
      checked: undefined,
      'data-test-subj': 'agentList.tagFilterClearAllOption',
      css: {
        'margin-left': '-20px', // hiding the checkbox space
      },
    };
    const newOptions: EuiSelectableOption[] = tags.map((tag) => ({
      label: tag,
      checked: selectedTags.includes(tag) ? 'on' : undefined,
      key: tag,
      'data-test-subj': 'agentList.tagFilterOption',
    }));

    newOptions.push(clearAllOption);
    return newOptions;
  }, [tags, selectedTags]);

  const [options, setOptions] = useState<EuiSelectableOption[]>(getOptions());

  useEffect(() => {
    setOptions(getOptions());
  }, [getOptions]);

  const renderTagOption = (option: EuiSelectableOption<string>): ReactNode => {
    const tag = option.label;
    if (tag === CLEAR_ALL) {
      return (
        <ClearAllTagsEl>
          <EuiHorizontalRule margin="none" />
          <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="error" color="danger" size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>Clear all</EuiFlexItem>
          </EuiFlexGroup>
        </ClearAllTagsEl>
      );
    }
    return <span className="euiSelectableListItem__content">{tag}</span>;
  };

  return (
    <EuiPopover
      ownFocus
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
          setOptions(newOptions);
          newOptions.forEach((option, index) => {
            if (option.checked !== options[index].checked) {
              const tag = option.key!;
              if (tag === CLEAR_ALL) {
                onSelectedTagsChange([]);
                return;
              }
              if (option.checked !== 'on') {
                removeTagsFilter(tag);
              } else {
                addTagsFilter(tag);
              }
              return;
            }
          });
        }}
        data-test-subj="agentList.agentPolicyFilterOptions"
        listProps={{
          paddingSize: 's',
          style: {
            minWidth: 140,
          },
        }}
        renderOption={renderTagOption}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};
