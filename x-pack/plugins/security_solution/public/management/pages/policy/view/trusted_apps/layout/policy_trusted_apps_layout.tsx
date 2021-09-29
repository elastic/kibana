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
import { PolicyTrustedAppsEmptyUnassigned, PolicyTrustedAppsEmptyUnexisting } from '../empty';

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
      {false ? (
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
      ) : null}
      <EuiPageContent
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        color="transparent"
        borderRadius="none"
      >
        {true ? (
          <PolicyTrustedAppsEmptyUnassigned
            policyId={'bf16726e-f863-41db-ae8e-b5fd88aa1e5f'}
            policyName={'With eventing'}
          />
        ) : (
          <PolicyTrustedAppsEmptyUnexisting
            policyId={'bf16726e-f863-41db-ae8e-b5fd88aa1e5f'}
            policyName={'With eventing'}
          />
        )}
      </EuiPageContent>
    </div>
  );
});

PolicyTrustedAppsLayout.displayName = 'PolicyTrustedAppsLayout';
