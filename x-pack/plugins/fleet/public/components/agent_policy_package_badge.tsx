/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';

import { PackageIcon } from '../components';
import { FLEET_SERVER_PACKAGE } from '../../common/constants';

interface Props {
  excludeFleetServer?: boolean;
  pkgName: string;
  pkgVersion?: string;
  pkgTitle: string;
}

export const AgentPolicyPackageBadge: React.FunctionComponent<Props> = ({
  excludeFleetServer,
  pkgName,
  pkgVersion,
  pkgTitle,
}) => {
  return (
    <EuiBadge color="hollow" isDisabled={excludeFleetServer && pkgName === FLEET_SERVER_PACKAGE}>
      <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <PackageIcon
            packageName={pkgName}
            version={pkgVersion || ''}
            tryApi={pkgVersion !== undefined}
            style={
              // when a custom SVG is used the logo is rendered with <img class="euiIcon euiIcon--small">
              // this collides with some EuiText (+img) CSS from the EuiIcon component
              // which  makes the button large, wide, and poorly layed out
              // override those styles until the bug is fixed or we find a better approach
              { margin: 'unset', width: '16px' }
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{pkgTitle}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiBadge>
  );
};
