/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiPopover, EuiBadgeGroup, EuiBadge } from '@elastic/eui';
import styled from 'styled-components';
import { TruncatableText } from '../truncatable_text';

interface TagOverflowProps {
  tags: string[];
}

const TagWrapper = styled(EuiBadgeGroup)`
  width: 100%;
`;

export const TagOverflow = React.memo<TagOverflowProps>(({ tags }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onClick = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  return (
    <>
      <TruncatableText>
        {tags.map((tag, i) => (
          <EuiBadge color="hollow" key={`${tag}-${i}`}>
            {tag}
          </EuiBadge>
        ))}
      </TruncatableText>
      <EuiPopover
        ownFocus
        button={<EuiButtonEmpty onClick={onClick}>See all</EuiButtonEmpty>}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
      >
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
      </EuiPopover>
    </>
  );
});
TagOverflow.displayName = 'TagOverflow';
