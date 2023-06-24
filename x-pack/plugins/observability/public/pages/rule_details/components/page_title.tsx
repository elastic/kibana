/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiBadge, EuiSpacer } from '@elastic/eui';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../../utils/kibana_react';
import { getHealthColor } from '../helpers/get_health_color';

interface PageTitleProps {
  rule: Rule;
}

export function PageTitle({ rule }: PageTitleProps) {
  const {
    triggersActionsUi: { getRuleTagBadge: RuleTagBadge },
  } = useKibana().services;

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false} data-test-subj="ruleName">
          {rule.name}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiSpacer size="m" />
        <EuiText size="xs">
          <EuiBadge color={getHealthColor(rule.executionStatus.status)}>
            {rule.executionStatus.status.charAt(0).toUpperCase() +
              rule.executionStatus.status.slice(1)}
          </EuiBadge>
        </EuiText>
        <EuiSpacer size="m" />
      </EuiFlexItem>
      <EuiFlexGroup direction="column" alignItems="flexStart">
        <EuiFlexItem component="span" grow={false}>
          <EuiText color="subdued" size="xs">
            <strong>
              {i18n.translate('xpack.observability.ruleDetails.lastUpdatedMessage', {
                defaultMessage: 'Last updated',
              })}
            </strong>
            &nbsp;
            {BY_WORD} {rule.updatedBy} {ON_WORD}&nbsp;
            {moment(rule.updatedAt).format('ll')} &emsp;
            <strong>
              {i18n.translate('xpack.observability.ruleDetails.createdWord', {
                defaultMessage: 'Created',
              })}
            </strong>
            &nbsp;
            {BY_WORD} {rule.createdBy} {ON_WORD}&nbsp;
            {moment(rule.createdAt).format('ll')}
          </EuiText>
        </EuiFlexItem>
        <EuiSpacer size="xs" />
      </EuiFlexGroup>

      {rule.tags.length > 0 && <RuleTagBadge tagsOutPopover tags={rule.tags} />}

      <EuiSpacer size="xs" />
    </>
  );
}

const BY_WORD = i18n.translate('xpack.observability.ruleDetails.byWord', {
  defaultMessage: 'by',
});

const ON_WORD = i18n.translate('xpack.observability.ruleDetails.onWord', {
  defaultMessage: 'on',
});
