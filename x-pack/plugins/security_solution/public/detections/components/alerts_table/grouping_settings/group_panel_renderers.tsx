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
  EuiIconTip,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { isArray } from 'lodash/fp';
import React from 'react';
import type { GroupPanelRenderer } from '@kbn/grouping/src';
import type { AlertsGroupingAggregation } from './types';
import { firstNonNullValue } from '../../../../../common/endpoint/models/ecs_safety_helpers';
import type { GenericBuckets } from '../../../../../common/search_strategy';
import { PopoverItems } from '../../../../common/components/popover_items';
import { COLUMN_TAGS } from '../../../pages/detection_engine/rules/translations';

export const renderGroupPanel: GroupPanelRenderer<AlertsGroupingAggregation> = (
  selectedGroup,
  bucket,
  nullGroupMessage
) => {
  switch (selectedGroup) {
    case 'kibana.alert.rule.name':
      return isArray(bucket.key) ? (
        <RuleNameGroupContent
          ruleName={bucket.key[0]}
          ruleDescription={
            firstNonNullValue(firstNonNullValue(bucket.description?.buckets)?.key) ?? ''
          }
          tags={bucket.ruleTags?.buckets}
        />
      ) : undefined;
    case 'host.name':
      return <HostNameGroupContent hostName={bucket.key} nullGroupMessage={nullGroupMessage} />;
    case 'user.name':
      return <UserNameGroupContent userName={bucket.key} nullGroupMessage={nullGroupMessage} />;
    case 'source.ip':
      return <SourceIpGroupContent sourceIp={bucket.key} nullGroupMessage={nullGroupMessage} />;
  }
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
    <div style={{ display: 'table', tableLayout: 'fixed', width: '100%' }}>
      <EuiFlexGroup data-test-subj="rule-name-group-renderer" gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false} style={{ display: 'contents' }}>
          <EuiTitle size="xs">
            <h5 className="eui-textTruncate">{ruleName.trim()}</h5>
          </EuiTitle>
        </EuiFlexItem>
        {tags && tags.length > 0 ? (
          <EuiFlexItem grow={false}>
            <PopoverItems
              items={tags.map((tag) => tag.key.toString())}
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
        <p className="eui-textTruncate">
          <EuiTextColor color="subdued">{ruleDescription}</EuiTextColor>
        </p>
      </EuiText>
    </div>
  );
});
RuleNameGroupContent.displayName = 'RuleNameGroup';

const HostNameGroupContent = React.memo<{ hostName: string | string[]; nullGroupMessage?: string }>(
  ({ hostName, nullGroupMessage }) => (
    <EuiFlexGroup data-test-subj="host-name-group-renderer" gutterSize="s" alignItems="center">
      <EuiFlexItem
        grow={false}
        style={{
          backgroundColor: euiThemeVars.euiColorVis1_behindText,
          borderRadius: '50%',
        }}
      >
        <EuiIcon type="database" size="l" style={{ padding: 4 }} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h5>{hostName}</h5>
        </EuiTitle>
      </EuiFlexItem>
      {nullGroupMessage && (
        <EuiFlexItem grow={false}>
          <EuiIconTip content={nullGroupMessage} position="right" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  )
);
HostNameGroupContent.displayName = 'HostNameGroupContent';

const UserNameGroupContent = React.memo<{ userName: string | string[]; nullGroupMessage?: string }>(
  ({ userName, nullGroupMessage }) => {
    const userNameValue = firstNonNullValue(userName) ?? '-';
    return (
      <EuiFlexGroup data-test-subj="user-name-group-renderer" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiAvatar name={userNameValue} color={euiThemeVars.euiColorVis0} />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h5>{userName}</h5>
          </EuiTitle>
        </EuiFlexItem>
        {nullGroupMessage && (
          <EuiFlexItem grow={false}>
            <EuiIconTip content={nullGroupMessage} position="right" />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
UserNameGroupContent.displayName = 'UserNameGroupContent';

const SourceIpGroupContent = React.memo<{ sourceIp: string | string[]; nullGroupMessage?: string }>(
  ({ sourceIp, nullGroupMessage }) => (
    <EuiFlexGroup data-test-subj="source-ip-group-renderer" gutterSize="s" alignItems="center">
      <EuiFlexItem
        grow={false}
        style={{
          backgroundColor: euiThemeVars.euiColorVis3_behindText,
          borderRadius: '50%',
        }}
      >
        <EuiIcon style={{ padding: 4 }} type="ip" size="l" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h5>{sourceIp}</h5>
        </EuiTitle>
      </EuiFlexItem>
      {nullGroupMessage && (
        <EuiFlexItem grow={false}>
          <EuiIconTip content={nullGroupMessage} position="right" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  )
);
SourceIpGroupContent.displayName = 'SourceIpGroupContent';
