/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import moment from 'moment';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiBetaBadge } from '@elastic/eui';
import { PageTitleProps } from '../types';
import { LAST_UPDATED_MESSAGE, CREATED_WORD, BY_WORD, ON_WORD } from '../translations';

export function PageTitle({ alert }: PageTitleProps) {
  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false} data-test-subj="alertName">
          {alert.name}
        </EuiFlexItem>
      </EuiFlexGroup>

      {alert.tags ? (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup gutterSize="m">
            {alert.tags.map((tag) => (
              <EuiFlexItem grow={false}>
                <EuiBetaBadge label={tag} color="hollow" />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="l" />
        </>
      ) : (
        <EuiSpacer size="xl" />
      )}

      <EuiFlexGroup direction="column" alignItems="flexStart">
        <EuiFlexItem component="span" grow={false}>
          <EuiText color="subdued" size="xs">
            <b>{LAST_UPDATED_MESSAGE}</b> {BY_WORD} {alert.updatedBy} {ON_WORD}&nbsp;
            {moment(alert.updatedAt).format('ll')} &emsp;
            <b>{CREATED_WORD}</b> {BY_WORD} {alert.createdBy} {ON_WORD}&nbsp;
            {moment(alert.createdAt).format('ll')}
          </EuiText>
        </EuiFlexItem>
        <EuiSpacer size="xs" />
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
    </>
  );
}
