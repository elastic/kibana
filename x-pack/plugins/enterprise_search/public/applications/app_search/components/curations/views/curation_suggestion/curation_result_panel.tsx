/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { Result as ResultType } from '../../../result/types';
import './curation_result_panel.scss';

interface Props {
  variant: 'current' | 'suggested';
  results?: ResultType[];
}

export const CurationResultPanel: React.FC<Props> = ({ variant = 'current', results }) => {
  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge>3</EuiNotificationBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <h5>Promoted results</h5>
          </EuiTitle>
        </EuiFlexItem>
        {variant === 'suggested' && (
          <EuiFlexItem>
            <EuiText color="subdued" textAlign="right" size="xs">
              <p>This curation can be automated by App Search</p>
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <div className={`curationResultPanel curationResultPanel--${variant}`}>
        <EuiPanel hasShadow={false}>
          <p>Just some stuff</p>
        </EuiPanel>
      </div>
    </>
  );
};
