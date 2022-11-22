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
import { getHealthColor } from '../utils';

export function PageTitle({ rule }: PageHeaderProps) {
  const {
    triggersActionsUi: { getRuleTagBadge: RuleTagBadge },
  } = useKibana().services;

  const { name, executionStatus, updatedBy, createdBy, updatedAt, createdAt, tags } = rule;

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false} data-test-subj="ruleName">
          {name}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiSpacer size="m" />
        <EuiText size="xs">
          <EuiBadge color={getHealthColor(executionStatus.status)}>
            {executionStatus.status.charAt(0).toUpperCase() + executionStatus.status.slice(1)}
          </EuiBadge>
        </EuiText>
        <EuiSpacer size="m" />
      </EuiFlexItem>
      <EuiFlexGroup direction="column" alignItems="flexStart">
        <EuiFlexItem component="span" grow={false}>
          <EuiText color="subdued" size="xs">
            <strong>{LAST_UPDATED_MESSAGE}</strong> {BY_WORD} {updatedBy} {ON_WORD}&nbsp;
            {moment(updatedAt).format('ll')} &emsp;
            <strong>{CREATED_WORD}</strong> {BY_WORD} {createdBy} {ON_WORD}&nbsp;
            {moment(createdAt).format('ll')}
          </EuiText>
        </EuiFlexItem>
        <EuiSpacer size="xs" />
      </EuiFlexGroup>
      {tags.length ? <RuleTagBadge tagsOutPopover tags={tags} /> : null}
    </>
  );
}
