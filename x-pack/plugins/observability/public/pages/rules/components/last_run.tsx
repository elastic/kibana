/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import moment from 'moment';
import { LastRunProps } from '../types';

export function LastRun({ date }: LastRunProps) {
  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            {moment(date).fromNow()}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
