/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlexItem,
  EuiBadge,
  EuiPopover,
  EuiTitle,
  EuiHorizontalRule,
  EuiPanel,
} from '@elastic/eui';
import { TAGS_TITLE } from '../translations';

interface TagsProps {
  tags: string[];
}
export function Tags({ tags }: TagsProps) {
  const [isTagsPopoverOpen, setIsTagsPopoverOpen] = useState(false);
  const tagsClicked = () =>
    setIsTagsPopoverOpen(
      (oldStateIsTagsPopoverOpen) => tags.length > 0 && !oldStateIsTagsPopoverOpen
    );
  const closeTagsPopover = () => setIsTagsPopoverOpen(false);

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiBadge
              color="hollow"
              iconType="tag"
              iconSide="left"
              onClick={tagsClicked}
              onClickAriaLabel="Rule tags"
              iconOnClick={tagsClicked}
              iconOnClickAriaLabel="Rule tags"
              data-test-sub="ruleTag"
            >
              {tags.length}
            </EuiBadge>
          }
          isOpen={isTagsPopoverOpen}
          closePopover={closeTagsPopover}
          anchorPosition="upCenter"
        >
          <EuiPanel
            hasBorder={false}
            hasShadow={false}
            style={{ maxWidth: '350px' }}
            paddingSize="none"
          >
            <EuiTitle size="xs">
              <h2>{TAGS_TITLE}</h2>
            </EuiTitle>
            <EuiHorizontalRule margin="xs" />

            {tags.map((tag) => (
              <EuiBadge color="hollow" data-test-sub="tag">
                {tag}
              </EuiBadge>
            ))}
          </EuiPanel>
        </EuiPopover>
      </EuiFlexItem>
    </>
  );
}
