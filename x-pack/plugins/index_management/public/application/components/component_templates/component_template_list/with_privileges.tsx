/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FunctionComponent } from 'react';

import {
  SectionError,
  useAuthorizationContext,
  WithPrivileges,
  SectionLoading,
  NotAuthorizedSection,
} from '../shared_imports';
import { APP_CLUSTER_REQUIRED_PRIVILEGES } from '../constants';

export const ComponentTemplatesWithPrivileges: FunctionComponent = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const { apiError } = useAuthorizationContext();

  if (apiError) {
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.home.componentTemplates.checkingPrivilegesErrorMessage"
            defaultMessage="Error fetching user privileges from the server."
          />
        }
        error={apiError}
      />
    );
  }

  return (
    <WithPrivileges
      privileges={APP_CLUSTER_REQUIRED_PRIVILEGES.map((privilege) => `cluster.${privilege}`)}
    >
      {({ isLoading, hasPrivileges, privilegesMissing }) => {
        if (isLoading) {
          return (
            <SectionLoading>
              <FormattedMessage
                id="xpack.idxMgmt.home.componentTemplates.checkingPrivilegesDescription"
                defaultMessage="Checking privileges…"
              />
            </SectionLoading>
          );
        }

        if (!hasPrivileges) {
          return (
            <NotAuthorizedSection
              title={
                <FormattedMessage
                  id="xpack.idxMgmt.home.componentTemplates.deniedPrivilegeTitle"
                  defaultMessage="Cluster privileges required"
                />
              }
              message={
                <FormattedMessage
                  id="xpack.idxMgmt.home.componentTemplates.deniedPrivilegeDescription"
                  defaultMessage="To use Component Templates, you must have {privilegesCount,
                    plural, one {this cluster privilege} other {these cluster privileges}}: {missingPrivileges}."
                  values={{
                    missingPrivileges: privilegesMissing.cluster!.join(', '),
                    privilegesCount: privilegesMissing.cluster!.length,
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
