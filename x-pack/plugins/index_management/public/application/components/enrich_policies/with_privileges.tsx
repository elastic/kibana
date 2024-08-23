/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { FunctionComponent } from 'react';

import {
  PageLoading,
  PageError,
  useAuthorizationContext,
  WithPrivileges,
  NotAuthorizedSection,
} from '../../../shared_imports';
import { ENRICH_POLICIES_REQUIRED_PRIVILEGES } from '../../constants';

export const EnrichPoliciesWithPrivileges: FunctionComponent<{
  children?: React.ReactNode;
}> = ({ children }) => {
  const { apiError } = useAuthorizationContext();

  if (apiError) {
    return (
      <PageError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.home.enrichPolicies.checkingPrivilegesErrorMessage"
            defaultMessage="Error fetching user privileges from the server."
          />
        }
        error={apiError}
      />
    );
  }

  return (
    <WithPrivileges
      privileges={ENRICH_POLICIES_REQUIRED_PRIVILEGES.map((privilege) => `cluster.${privilege}`)}
    >
      {({ isLoading, hasPrivileges, privilegesMissing }) => {
        if (isLoading) {
          return (
            <PageLoading>
              <FormattedMessage
                id="xpack.idxMgmt.home.enrichPolicies.checkingPrivilegesDescription"
                defaultMessage="Checking privileges…"
              />
            </PageLoading>
          );
        }

        if (!hasPrivileges) {
          return (
            <NotAuthorizedSection
              dataTestSubj="enrichPoliciesInsuficientPrivileges"
              title={
                <FormattedMessage
                  id="xpack.idxMgmt.home.enrichPolicies.deniedPrivilegeTitle"
                  defaultMessage="Manage enrich privileges required"
                />
              }
              message={
                <FormattedMessage
                  id="xpack.idxMgmt.home.enrichPolicies.deniedPrivilegeDescription"
                  defaultMessage="To use Enrich Policies, you must have the following cluster privileges: {missingPrivileges}."
                  values={{
                    missingPrivileges: privilegesMissing.cluster!.join(', '),
                  }}
                />
              }
            />
          );
        }

        return <>{children}</>;
      }}
    </WithPrivileges>
  );
};
