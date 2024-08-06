/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isArray } from 'lodash/fp';
import { firstNonNullValue, GroupPanelRenderer } from '@kbn/grouping/src';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { AlertsByGroupingAgg } from '../../../components/alerts_table/types';
import { Tags } from '../../../components/tags';
import { unknown } from './constants';

export const renderGroupPanel: GroupPanelRenderer<AlertsByGroupingAgg> = (
  selectedGroup,
  bucket
) => {
  switch (selectedGroup) {
    case 'kibana.alert.rule.name':
      return isArray(bucket.key) ? (
        <RuleNameGroupContent
          ruleName={bucket.key[0]}
          tags={bucket.ruleTags?.buckets.map((tag: any) => tag.key)}
        />
      ) : undefined;
    case 'kibana.alert.instance.id':
      return <InstanceIdGroupContent instanceId={firstNonNullValue(bucket.key)} />;
  }
};

const RuleNameGroupContent = React.memo<{
  ruleName: string;
  tags?: string[] | undefined;
}>(({ ruleName, tags }) => {
  return (
    <div style={{ display: 'table', tableLayout: 'fixed', width: '100%' }}>
      <EuiFlexGroup data-test-subj="rule-name-group-renderer" gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false} style={{ display: 'contents' }}>
          <EuiTitle size="xs">
            <h5 className="eui-textTruncate">{ruleName}</h5>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      {!!tags && tags.length > 0 && (
        <EuiText size="s">
          <Tags tags={tags} color="hollow" size={5} oneLine />
        </EuiText>
      )}
    </div>
  );
});
RuleNameGroupContent.displayName = 'RuleNameGroup';

const InstanceIdGroupContent = React.memo<{
  instanceId?: string;
}>(({ instanceId }) => {
  return (
    <div style={{ display: 'table', tableLayout: 'fixed', width: '100%' }}>
      <EuiFlexGroup data-test-subj="rule-name-group-renderer" gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false} style={{ display: 'contents' }}>
          <EuiTitle size="xs">
            <h5 className="eui-textTruncate">
              {instanceId === '*' ? unknown : instanceId ?? '--'}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});
InstanceIdGroupContent.displayName = 'InstanceIdGroupContent';
