/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';

import { AuthorizationContext, MissingPrivileges } from './authorization_provider';

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

type Privilege = [string, string];

const toArray = (value: string | string[]): string[] =>
  Array.isArray(value) ? (value as string[]) : ([value] as string[]);

export const WithPrivileges = ({ privileges: requiredPrivileges, children }: Props) => {
  const { isLoading, privileges } = useContext(AuthorizationContext);

  const privilegesToArray: Privilege[] = toArray(requiredPrivileges).map(p => {
    const [section, privilege] = p.split('.');
    if (!privilege) {
      // Oh! we forgot to use the dot "." notation.
      throw new Error('Required privilege must have the format "section.privilege"');
    }
    return [section, privilege];
  });

  const hasPrivileges = isLoading
    ? false
    : privilegesToArray.every(privilege => {
        const [section, requiredPrivilege] = privilege;
        if (!privileges.missingPrivileges[section]) {
          // if the section does not exist in our missingPriviledges, everything is OK
          return true;
        }
        if (privileges.missingPrivileges[section]!.length === 0) {
          return true;
        }
        if (requiredPrivilege === '*') {
          // If length > 0 and we require them all... KO
          return false;
        }
        // If we require _some_ privilege, we make sure that the one
        // we require is *not* in the missingPrivilege array
        return !privileges.missingPrivileges[section]!.includes(requiredPrivilege);
      });

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
