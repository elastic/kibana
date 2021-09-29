/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiTitle,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageContent,
} from '@elastic/eui';

export const PolicyTrustedAppsLayout = React.memo(() => {
  const onClickAssignTrustedAppButton = useCallback(() => {
    /* TODO: to be implemented*/
  }, []);
  const assignTrustedAppButton = useMemo(
    () => (
      <EuiButton fill iconType="plusInCircle" onClick={onClickAssignTrustedAppButton}>
        {i18n.translate(
          'xpack.securitySolution.endpoint.policy.trustedApps.layout.assignToPolicy',
          {
            defaultMessage: 'Assign trusted applications to policy',
          }
        )}
      </EuiButton>
    ),
    [onClickAssignTrustedAppButton]
  );

  return (
    <div>
      <EuiPageHeader alignItems="center">
        <EuiPageHeaderSection>
          <EuiTitle size="m">
            <h2>
              {i18n.translate('xpack.securitySolution.endpoint.policy.trustedApps.layout.title', {
                defaultMessage: 'Assigned trusted applications',
              })}
            </h2>
          </EuiTitle>
        </EuiPageHeaderSection>
        <EuiPageHeaderSection>{assignTrustedAppButton}</EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        color="transparent"
        borderRadius="none"
      >
        {/* TODO: To be implemented */}
        {'Policy trusted apps layout content'}
      </EuiPageContent>
    </div>
  );
});

PolicyTrustedAppsLayout.displayName = 'PolicyTrustedAppsLayout';
