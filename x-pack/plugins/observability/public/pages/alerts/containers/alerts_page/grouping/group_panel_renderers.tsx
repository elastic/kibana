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
import { isArray } from 'lodash/fp';
import React from 'react';
import type { RawBucket } from '@kbn/securitysolution-grouping';
import { PopoverItems } from './popover_items';
import type { AlertsGroupingAggregation } from './types';
export const getSelectedGroupButtonContent = (
  selectedGroup: string,
  bucket: RawBucket<AlertsGroupingAggregation>
) => {
  switch (selectedGroup) {
    case 'kibana.alert.rule.name':
      return isArray(bucket.key) ? (
        <RuleNameGroupContent
          ruleName={bucket.key[0]}
          ruleDescription={bucket.key[1]}
          tags={bucket.ruleTags?.buckets}
        />
      ) : undefined;
    case 'kibana.alert.rule.category':
      return <UserNameGroupContent userName={bucket.key} />;
    case 'host.name':
      return <HostNameGroupContent hostName={bucket.key} />;
    case 'kibana.alert.rule.category':
      return <UserNameGroupContent userName={bucket.key} />;
    case 'agent.name':
      return <AgentNameGroupContent sourceIp={bucket.key} />;
  }
};

const RuleNameGroupContent = React.memo<{
  ruleName: string;
  ruleDescription: string;
  // TO DO: unkonwn is GenericBuckes
  tags?: unknown[] | undefined;
}>(({ ruleName, ruleDescription, tags }) => {
  const renderItem = (tag: string, i: number) => (
    <EuiBadge color="hollow" key={`${tag}-${i}`} data-test-subj="tag">
      {tag}
    </EuiBadge>
  );
  console.log({ euiThemeVars });
  return (
    <>
      <EuiFlexGroup data-test-subj="rule-name-group-renderer" gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false} style={{ display: 'table', tableLayout: 'fixed', width: '100%' }}>
          <EuiTitle size="xs">
            <h5 className="eui-textTruncate">{ruleName.trim()}</h5>
          </EuiTitle>
          <EuiText size="s">
            <p className="eui-textTruncate">
              <EuiTextColor color="subdued">{ruleDescription}</EuiTextColor>
            </p>
          </EuiText>
        </EuiFlexItem>
        {tags && tags.length > 0 ? (
          <EuiFlexItem onClick={(e) => e.stopPropagation()} grow={false}>
            <PopoverItems
              items={tags.map((tag) => tag.key.toString())}
              popoverTitle={'Tags'}
              popoverButtonTitle={tags.length.toString()}
              popoverButtonIcon="tag"
              dataTestPrefix="tags"
              renderItem={renderItem}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </>
  );
});
RuleNameGroupContent.displayName = 'RuleNameGroup';

const HostNameGroupContent = React.memo<{ hostName: string | string[] }>(({ hostName }) => (
  <EuiFlexGroup
    data-test-subj="host-name-group-renderer"
    gutterSize="s"
    alignItems="center"
    justifyContent="center"
  >
    <EuiFlexItem
      grow={false}
      style={{
        backgroundColor: euiThemeVars.euiColorVis1_behindText,
        borderRadius: '50%',
      }}
    >
      <EuiIcon type="database" size="l" style={{ padding: 4 }} />
    </EuiFlexItem>

    <EuiFlexItem>
      <EuiTitle size="xs">
        <h5>{hostName}</h5>
      </EuiTitle>
    </EuiFlexItem>
  </EuiFlexGroup>
));
HostNameGroupContent.displayName = 'HostNameGroupContent';

const UserNameGroupContent = React.memo<{ userName: string | string[] }>(({ userName }) => {
  const userNameValue = isArray(userName) ? userName[0] : userName;
  return (
    <EuiFlexGroup data-test-subj="user-name-group-renderer" gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiAvatar name={userNameValue} color={euiThemeVars.euiColorVis0} />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiTitle size="xs">
          <h5>{userName}</h5>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
UserNameGroupContent.displayName = 'UserNameGroupContent';

const AgentNameGroupContent = React.memo<{ sourceIp: string | string[] }>(({ sourceIp }) => (
  <EuiFlexGroup data-test-subj="agent-name-group-renderer" gutterSize="s" alignItems="center">
    <EuiFlexItem
      grow={false}
      style={{
        backgroundColor: euiThemeVars.euiColorVis2_behindText,
        borderRadius: '50%',
      }}
    >
      <EuiIcon style={{ padding: 4 }} type="reporter" size="l" />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiTitle size="xs">
        <h5>{sourceIp}</h5>
      </EuiTitle>
    </EuiFlexItem>
  </EuiFlexGroup>
));
AgentNameGroupContent.displayName = 'AgentNameGroupContent';
