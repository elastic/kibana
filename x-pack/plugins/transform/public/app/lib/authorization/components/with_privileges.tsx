/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, FC } from 'react';

import { EuiPageContent } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { MissingPrivileges } from '../../../../../common';

import { SectionLoading } from '../../../components';

import { AuthorizationContext } from './authorization_provider';
import { NotAuthorizedSection } from './not_authorized_section';
import { hasPrivilegeFactory, toArray, Privilege } from './common';

interface Props {
  /**
   * Each required privilege must have the format "section.privilege".
   * To indicate that *all* privileges from a section are required, we can use the asterix
   * e.g. "index.*"
   */
  privileges: string | string[];
  children: (childrenProps: {
    isLoading: boolean;
    hasPrivileges: boolean;
    privilegesMissing: MissingPrivileges;
  }) => JSX.Element;
}

export const WithPrivileges = ({ privileges: requiredPrivileges, children }: Props) => {
  const { isLoading, privileges } = useContext(AuthorizationContext);

  const privilegesToArray: Privilege[] = toArray(requiredPrivileges).map((p) => {
    const [section, privilege] = p.split('.');
    if (!privilege) {
      // Oh! we forgot to use the dot "." notation.
      throw new Error('Required privilege must have the format "section.privilege"');
    }
    return [section, privilege];
  });

  const hasPrivilege = hasPrivilegeFactory(privileges);
  const hasPrivileges = isLoading ? false : privilegesToArray.every(hasPrivilege);

  const privilegesMissing = privilegesToArray.reduce((acc, [section, privilege]) => {
    if (privilege === '*') {
      acc[section] = privileges.missingPrivileges[section] || [];
    } else if (
      privileges.missingPrivileges[section] &&
      privileges.missingPrivileges[section]!.includes(privilege)
    ) {
      const missing: string[] = acc[section] || [];
      acc[section] = [...missing, privilege];
    }

    return acc;
  }, {} as MissingPrivileges);

  return children({ isLoading, hasPrivileges, privilegesMissing });
};

interface MissingClusterPrivilegesProps {
  missingPrivileges: string;
  privilegesCount: number;
}

const MissingClusterPrivileges: FC<MissingClusterPrivilegesProps> = ({
  missingPrivileges,
  privilegesCount,
}) => (
  <EuiPageContent>
    <NotAuthorizedSection
      title={
        <FormattedMessage
          id="xpack.transform.app.deniedPrivilegeTitle"
          defaultMessage="You're missing cluster privileges"
        />
      }
      message={
        <FormattedMessage
          id="xpack.transform.app.deniedPrivilegeDescription"
          defaultMessage="To use this section of Transforms, you must have {privilegesCount,
          plural, one {this cluster privilege} other {these cluster privileges}}: {missingPrivileges}."
          values={{
            missingPrivileges,
            privilegesCount,
          }}
        />
      }
    />
  </EuiPageContent>
);

export const PrivilegesWrapper: FC<{ privileges: string | string[] }> = ({
  children,
  privileges,
}) => (
  <WithPrivileges privileges={privileges}>
    {({ isLoading, hasPrivileges, privilegesMissing }) => {
      if (isLoading) {
        return (
          <SectionLoading>
            <FormattedMessage
              id="xpack.transform.app.checkingPrivilegesDescription"
              defaultMessage="Checking privileges…"
            />
          </SectionLoading>
        );
      }

      if (!hasPrivileges) {
        return (
          <MissingClusterPrivileges
            missingPrivileges={privilegesMissing.cluster!.join(', ')}
            privilegesCount={privilegesMissing.cluster!.length}
          />
        );
      }

      return <>{children}</>;
    }}
  </WithPrivileges>
);
