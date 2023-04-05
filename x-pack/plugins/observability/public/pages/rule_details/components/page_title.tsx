/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import moment from 'moment';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiBadge, EuiSpacer } from '@elastic/eui';
import { PageHeaderProps } from '../types';
import { useKibana } from '../../../utils/kibana_react';
import { LAST_UPDATED_MESSAGE, CREATED_WORD, BY_WORD, ON_WORD } from '../translations';
import { getHealthColor } from '../config';

export function PageTitle({ rule }: PageHeaderProps) {
  const { triggersActionsUi } = useKibana().services;

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
            <b>{LAST_UPDATED_MESSAGE}</b> {BY_WORD} {rule.updatedBy} {ON_WORD}&nbsp;
            {moment(rule.updatedAt).format('ll')} &emsp;
            <b>{CREATED_WORD}</b> {BY_WORD} {rule.createdBy} {ON_WORD}&nbsp;
            {moment(rule.createdAt).format('ll')}
          </EuiText>
        </EuiFlexItem>
        <EuiSpacer size="xs" />
      </EuiFlexGroup>
      {rule.tags.length > 0 &&
        triggersActionsUi.getRuleTagBadge<'tagsOutPopover'>({
          tagsOutPopover: true,
          tags: rule.tags,
        })}
      <EuiSpacer size="xs" />
    </>
  );
}
