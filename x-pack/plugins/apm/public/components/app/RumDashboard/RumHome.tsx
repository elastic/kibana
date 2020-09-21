/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { RumOverview } from '../RumDashboard';
import { RumHeader } from './RumHeader';

export function RumHome() {
  return (
    <div>
      <RumHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>
                {i18n.translate('xpack.apm.csm.title', {
                  defaultMessage: 'Client Side Monitoring',
                })}
              </h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </RumHeader>
      <RumOverview />
    </div>
  );
}
