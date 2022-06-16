/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiBadge, EuiPopoverTitle, EuiFlexGroup } from '@elastic/eui';

const tagTitle = i18n.translate(
  'xpack.triggersActionsUI.sections.rules_list.rules_tag_badge.tagTitle',
  {
    defaultMessage: 'Tag',
  }
);

export interface RuleTagBadgeCommonProps {
  tags: string[];
  badgeDataTestSubj?: string;
  titleDataTestSubj?: string;
  tagItemDataTestSubj?: (tag: string) => string;
}
export type RuleTagBadgeConditionalProps =
  | {
      isOpen: boolean;
      onClick: React.MouseEventHandler<HTMLButtonElement>;
      onClose: () => void;
    }
  | {
      spread: boolean;
    };
export type RuleTagBadgeProps = RuleTagBadgeCommonProps & RuleTagBadgeConditionalProps;
const containerStyle = {
  width: '300px',
};

const getTagItemDataTestSubj = (tag: string) => `ruleTagBadgeItem-${tag}`;

export const RuleTagBadge = (props: RuleTagBadgeProps) => {
  const {
    isOpen = false,
    tags = [],
    onClick,
    onClose,
    spread,
    badgeDataTestSubj = 'ruleTagBadge',
    titleDataTestSubj = 'ruleTagPopoverTitle',
    tagItemDataTestSubj = getTagItemDataTestSubj,
  } = props;

  const badge = useMemo(() => {
    return (
      <EuiBadge
        data-test-subj={badgeDataTestSubj}
        color="hollow"
        iconType="tag"
        iconSide="left"
        tabIndex={-1}
        onClick={onClick}
        onClickAriaLabel="Tags"
        iconOnClick={onClick}
        iconOnClickAriaLabel="Tags"
      >
        {tags.length}
      </EuiBadge>
    );
  }, [tags, badgeDataTestSubj, onClick]);

  const tagBadges = useMemo(
    () =>
      tags.map((tag, index) => (
        <EuiBadge
          data-test-subj={tagItemDataTestSubj(tag)}
          key={index}
          color="hollow"
          iconType="tag"
          iconSide="left"
        >
          {tag}
        </EuiBadge>
      )),
    [tags, tagItemDataTestSubj]
  );
  return spread ? (
    // Put 0 to fix negative left margin value.
    <EuiFlexGroup data-test-subj="spreadTags" style={{ marginLeft: 0 }} wrap={true}>
      {tagBadges}
    </EuiFlexGroup>
  ) : (
    <EuiPopover button={badge} anchorPosition="upCenter" isOpen={isOpen} closePopover={onClose}>
      <EuiPopoverTitle data-test-subj={titleDataTestSubj}>{tagTitle}</EuiPopoverTitle>
      <div style={containerStyle}>{tagBadges}</div>
    </EuiPopover>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleTagBadge as default };
