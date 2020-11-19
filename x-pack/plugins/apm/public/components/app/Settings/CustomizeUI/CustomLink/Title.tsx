/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function Title() {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <h2>
                {i18n.translate('xpack.apm.settings.customizeUI.customLink', {
                  defaultMessage: 'Custom Links',
                })}
              </h2>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
