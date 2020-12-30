/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import { GroupLogic } from '../group_logic';
import { NAV } from '../../../constants';

import { SideNavLink } from '../../../../shared/layout';

import { getGroupPath, getGroupSourcePrioritizationPath } from '../../../routes';

export const GroupSubNav: React.FC = () => {
  const {
    group: { id },
  } = useValues(GroupLogic);

  if (!id) return null;

  return (
    <>
      <SideNavLink to={getGroupPath(id)}>{NAV.GROUP_OVERVIEW}</SideNavLink>
      <SideNavLink to={getGroupSourcePrioritizationPath(id)}>
        {NAV.SOURCE_PRIORITIZATION}
      </SideNavLink>
    </>
  );
};
