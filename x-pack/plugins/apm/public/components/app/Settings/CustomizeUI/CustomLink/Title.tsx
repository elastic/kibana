/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const Title = () => (
  <EuiFlexGroup alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiTitle size="s">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <h1>
              {i18n.translate('xpack.apm.settings.customizeUI.customLink', {
                defaultMessage: 'Custom Links',
              })}
            </h1>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiIconTip
              type="iInCircle"
              position="top"
              content={i18n.translate(
                'xpack.apm.settings.customizeUI.customLink.info',
                {
                  defaultMessage:
                    'These links will be shown in the Actions context menu for transactions.',
                }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTitle>
    </EuiFlexItem>
  </EuiFlexGroup>
);
