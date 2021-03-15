/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiButton } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { PackageCustomExtensionComponentProps } from '../../../fleet/public';
import { useKibana } from '../common/lib/kibana';

/**
 * Exports Osquery-specific package policy instructions
 * for use in the Fleet app custom tab
 */
export const OsqueryManagedCustomButtonExtension = React.memo<PackageCustomExtensionComponentProps>(
  () => {
    const { navigateToApp, getUrlForApp } = useKibana().services.application;

    const handleClick = useCallback(() => navigateToApp('osquery'), [navigateToApp]);
    const osqueryAppUrl = useMemo(() => getUrlForApp('osquery'), [getUrlForApp]);

    return (
      <EuiFlexGroup direction="column" alignItems="flexStart">
        <EuiFlexItem>
          <EuiText>{'You can manage your queries from the Osquery app'}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          {
            // eslint-disable-next-line @elastic/eui/href-or-on-click
            <EuiButton
              fill
              href={osqueryAppUrl}
              onClick={handleClick}
              iconType="popout"
              iconSide="right"
              target="_blank"
            >
              {'Go to Osquery app'}
            </EuiButton>
          }
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
OsqueryManagedCustomButtonExtension.displayName = 'OsqueryManagedCustomButtonExtension';
