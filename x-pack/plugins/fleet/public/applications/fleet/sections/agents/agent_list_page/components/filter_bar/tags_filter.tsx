/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFilterButton,
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';

import { MAX_TAG_DISPLAY_LENGTH, truncateTag } from '../../utils';

const ClearAllTagsFilterItem = styled(EuiFilterSelectItem)`
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
  const { euiTheme } = useEuiTheme();

  const [isTagsFilterOpen, setIsTagsFilterOpen] = useState<boolean>(false);

  const addTagsFilter = (tag: string) => {
    onSelectedTagsChange([...selectedTags, tag]);
  };

  const removeTagsFilter = (tag: string) => {
    onSelectedTagsChange(selectedTags.filter((t) => t !== tag));
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
      {/* EUI NOTE: Please use EuiSelectable (which already has height/scrolling built in)
            instead of EuiFilterSelectItem (which is pending deprecation).
            @see https://elastic.github.io/eui/#/forms/filter-group#multi-select */}
      <div className="eui-yScroll" css={{ maxHeight: euiTheme.base * 30 }}>
        <>
          {tags.map((tag, index) => (
            <EuiFilterSelectItem
              checked={selectedTags.includes(tag) ? 'on' : undefined}
              key={index}
              onClick={() => {
                if (selectedTags.includes(tag)) {
                  removeTagsFilter(tag);
                } else {
                  addTagsFilter(tag);
                }
              }}
            >
              {tag.length > MAX_TAG_DISPLAY_LENGTH ? (
                <EuiToolTip content={tag}>
                  <span>{truncateTag(tag)}</span>
                </EuiToolTip>
              ) : (
                tag
              )}
            </EuiFilterSelectItem>
          ))}

          <EuiHorizontalRule margin="none" />

          <ClearAllTagsFilterItem
            showIcons={false}
            onClick={() => {
              onSelectedTagsChange([]);
            }}
          >
            <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="error" color="danger" size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>Clear all</EuiFlexItem>
            </EuiFlexGroup>
          </ClearAllTagsFilterItem>
        </>
      </div>
    </EuiPopover>
  );
};
