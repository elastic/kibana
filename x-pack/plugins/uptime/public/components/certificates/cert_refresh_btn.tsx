/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHideFor,
  EuiShowFor,
} from '@elastic/eui';
import * as labels from '../../pages/translations';
import { UptimeRefreshContext } from '../../contexts';

export const CertRefreshBtn = () => {
  const { refreshApp } = useContext(UptimeRefreshContext);

  return (
    <EuiFlexItem
      style={{ alignItems: 'flex-end' }}
      grow={false}
      data-test-subj="certificatesRefreshButton"
    >
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiHideFor sizes={['xs']}>
            <EuiButton
              fill
              iconType="refresh"
              onClick={() => {
                refreshApp();
              }}
              data-test-subj="superDatePickerApplyTimeButton"
            >
              {labels.REFRESH_CERT}
            </EuiButton>
          </EuiHideFor>
          <EuiShowFor sizes={['xs']}>
            <EuiButtonEmpty
              iconType="refresh"
              onClick={() => {
                refreshApp();
              }}
              data-test-subj="superDatePickerApplyTimeButton"
            />
          </EuiShowFor>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
