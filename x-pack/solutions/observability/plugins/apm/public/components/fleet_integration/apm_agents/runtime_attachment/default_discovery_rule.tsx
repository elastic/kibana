/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiBadge } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export function DefaultDiscoveryRule() {
  return (
    <EuiPanel paddingSize="m" style={{ margin: 4 }} hasBorder={true}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false} style={{ marginLeft: 100 }}>
          <EuiBadge color="danger">
            {i18n.translate('xpack.apm.defaultDiscoveryRule.excludeBadgeLabel', {
              defaultMessage: 'Exclude',
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            {i18n.translate('xpack.apm.defaultDiscoveryRule.everythingElseTextLabel', {
              defaultMessage: 'Everything else',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
