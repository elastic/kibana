import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiBadge,
} from '@elastic/eui';
import React from 'react';

export function DefaultDiscoveryRule() {
  return (
    <EuiPanel paddingSize="m" style={{ margin: 4 }}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText size="s">Everything else</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="danger">Exclude</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">All</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
