/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import type { FunctionComponent } from 'react';
import React from 'react';
import type { GenericBuckets } from '../../../../../common/search_strategy';
import type { RawBucket } from '../../../../common/components/grouping';
import { PopoverItems } from '../../../../common/components/popover_items';
import { COLUMN_TAGS } from '../../../pages/detection_engine/rules/translations';

export const getSelectedGroupButtonContent = (selectedGroup: string, bucket: RawBucket) => {
  switch (selectedGroup) {
    case 'kibana.alert.rule.name':
      return (
        <RuleNameGroupContent
          ruleName={bucket.key[0]}
          ruleDescription={bucket.key[1]}
          tags={bucket.ruleTags?.buckets}
        />
      );
    case 'host.name':
      return <HostNameGroupContent hostName={bucket.key} />;
    case 'user.name':
      return <UserNameGroupContent userName={bucket.key} />;
  }
  return <DefaultGroupContent fieldValue={bucket.key} />;
};

const RuleNameGroupContent = React.memo<{
  ruleName: string;
  ruleDescription: string;
  tags?: GenericBuckets[] | undefined;
}>(({ ruleName, ruleDescription, tags }) => {
  const renderItem = (tag: string, i: number) => (
    <EuiBadge color="hollow" key={`${tag}-${i}`} data-test-subj="tag">
      {tag}
    </EuiBadge>
  );
  return (
    <div>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs" className="euiAccordionForm__title">
            <h4>{ruleName.trim()}</h4>
          </EuiTitle>
        </EuiFlexItem>
        {tags && tags.length > 0 ? (
          <EuiFlexItem onClick={(e) => e.stopPropagation()} grow={false}>
            <PopoverItems
              items={tags.map((tag) => tag.key)}
              popoverTitle={COLUMN_TAGS}
              popoverButtonTitle={tags.length.toString()}
              popoverButtonIcon="tag"
              dataTestPrefix="tags"
              renderItem={renderItem}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>

      <EuiText size="s">
        <p>
          <EuiTextColor color="subdued">{ruleDescription}</EuiTextColor>
        </p>
      </EuiText>
    </div>
  );
});
RuleNameGroupContent.displayName = 'RuleNameGroup';

const HostNameGroupContent = React.memo<{ hostName: string }>(({ hostName }) => (
  <div>
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon color="primary" type="database" size="l" />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiTitle size="xs" className="euiAccordionForm__title">
          <h4>{hostName}</h4>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  </div>
));
HostNameGroupContent.displayName = 'HostNameGroupContent';

const UserNameGroupContent = React.memo<{ userName: string }>(({ userName }) => {
  return (
    <div>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiAvatar name={userName.toString()} color={euiThemeVars.euiColorVis0} />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiTitle size="xs" className="euiAccordionForm__title">
            <h4>{userName}</h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});
UserNameGroupContent.displayName = 'UserNameGroupContent';

const DefaultGroupContent: FunctionComponent<{ fieldValue: string }> = ({ fieldValue }) => (
  <div>
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiTitle size="xs" className="euiAccordionForm__title">
          <h4>{fieldValue}</h4>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  </div>
);
