/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';
import { i18n } from '@kbn/i18n';

import { GroupLogic } from '../group_logic';

import { SideNavLink } from '../../../../shared/layout';

import { getGroupPath, getGroupSourcePrioritizationPath } from '../../../routes';

export const GroupSubNav: React.FC = () => {
  const {
    group: { id },
  } = useValues(GroupLogic);

  if (!id) return null;

  return (
    <>
      <SideNavLink to={getGroupPath(id)}>
        {i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.groups.groupOverview', {
          defaultMessage: 'Overview',
        })}
      </SideNavLink>
      <SideNavLink to={getGroupSourcePrioritizationPath(id)}>
        {i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.groups.sourcePrioritization', {
          defaultMessage: 'Source Prioritization',
        })}
      </SideNavLink>
    </>
  );
};
