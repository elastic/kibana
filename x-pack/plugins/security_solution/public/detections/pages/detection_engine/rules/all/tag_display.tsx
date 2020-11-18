/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import { EuiPopover, EuiBadgeGroup, EuiBadge, EuiButtonEmpty } from '@elastic/eui';
import styled from 'styled-components';
import * as i18n from '../translations';
import { caseInsensitiveSort } from './helpers';

interface TagsDisplayProps {
  tags: string[];
}

const TagWrapper = styled(EuiBadgeGroup)`
  width: 100%;
`;

const TagPopoverWrapper = styled(EuiBadgeGroup)`
  max-height: 200px;
  max-width: 600px;
  overflow: auto;
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
  const sortedTags = useMemo(() => caseInsensitiveSort(tags), [tags]);

  return (
    <>
      {sortedTags.length <= 3 ? (
        <TagWrapper data-test-subj="tags">
          {sortedTags.map((tag: string, i: number) => (
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
          {sortedTags.slice(0, 3).map((tag: string, i: number) => (
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
            data-test-subj="tags-display-popover"
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
              {sortedTags.map((tag: string, i: number) => (
                <EuiBadge
                  color="hollow"
                  key={`${tag}-${i}`}
                  data-test-subj={`rules-table-column-popover-tags-${i}`}
                  title={tag}
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
