/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { RumOverview } from '../RumDashboard';
import { CsmSharedContextProvider } from './CsmSharedContext';
import { MainFilters } from './Panels/MainFilters';
import { DatePicker } from '../../shared/DatePicker';

export const UX_LABEL = i18n.translate('xpack.apm.ux.title', {
  defaultMessage: 'User Experience',
});

export function RumHome() {
  return (
    <CsmSharedContextProvider>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle>
            <h1 className="eui-textNoWrap">{UX_LABEL}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            wrap
            style={{ flexWrap: 'wrap-reverse' }}
            justifyContent="flexEnd"
            gutterSize="s"
          >
            <MainFilters />
            <EuiFlexItem grow={false}>
              <DatePicker />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <RumOverview />
    </CsmSharedContextProvider>
  );
}
