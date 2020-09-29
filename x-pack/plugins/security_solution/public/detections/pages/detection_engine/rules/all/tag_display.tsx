/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiText,
  EuiFieldSearch,
  EuiPopoverTitle,
  EuiBadgeGroup,
  EuiBadge,
  EuiButtonEmpty,
} from '@elastic/eui';
import styled from 'styled-components';
import * as i18n from '../translations';

interface TagsDisplayProps {
  tags: string[];
}

const TagWrapper = styled(EuiBadgeGroup)`
  width: 100%;
`;

const TagPopoverWrapper = styled(EuiBadgeGroup)`
  width: min-content;
`;

const TagPopoverButton = styled(EuiButtonEmpty)`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS}
  font-weight: 500;
  height: 20px;
`;

/**
 * @param tags to display for filtering
 */
const TagsDisplayComponent = ({ tags }: TagsDisplayProps) => {
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);

  return (
    <>
      {tags.length <= 3 ? (
        <TagWrapper data-test-subj="tags">
          {tags.map((tag: string, i: number) => (
            <EuiBadge
              color="hollow"
              key={`${tag}-${i}`}
              data-test-subj={`rules-table-column-tags-${i}`}
            >
              {tag}
            </EuiBadge>
          ))}
        </TagWrapper>
      ) : (
        <TagWrapper data-test-subj="tags">
          {tags.slice(0, 3).map((tag: string, i: number) => (
            <EuiBadge
              color="hollow"
              key={`${tag}-${i}`}
              data-test-subj={`rules-table-column-tags-${i}`}
            >
              {tag}
            </EuiBadge>
          ))}

          <EuiPopover
            ownFocus
            display="block"
            button={
              <TagPopoverButton
                size="xs"
                data-test-subj={'tags-display-popover-button'}
                onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
              >
                {i18n.COLUMN_SEE_ALL_POPOVER}
              </TagPopoverButton>
            }
            isOpen={isTagPopoverOpen}
            closePopover={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
            repositionOnScroll
          >
            <TagPopoverWrapper>
              {tags.map((tag: string, i: number) => (
                <EuiBadge
                  color="hollow"
                  key={`${tag}-${i}`}
                  data-test-subj={`rules-table-column-popover-tags-${i}`}
                >
                  {tag}
                </EuiBadge>
              ))}
            </TagPopoverWrapper>
          </EuiPopover>
        </TagWrapper>
      )}
    </>
  );
};

export const TagsDisplay = React.memo(TagsDisplayComponent);

TagsDisplay.displayName = 'TagsDisplay';
