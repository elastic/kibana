/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGrid } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ContentSection } from '../../components/shared/content_section';
import { SOURCES_PATH, USERS_AND_ROLES_PATH } from '../../routes';

import { OverviewLogic } from './overview_logic';
import { StatisticCard } from './statistic_card';

export const OrganizationStats: React.FC = () => {
  const { sourcesCount, pendingInvitationsCount, accountsCount, privateSourcesCount } =
    useValues(OverviewLogic);

  return (
    <ContentSection
      title={
        <FormattedMessage
          id="xpack.enterpriseSearch.workplaceSearch.organizationStats.title"
          defaultMessage="Usage statistics"
        />
      }
    >
      <EuiFlexGrid columns={4}>
        <StatisticCard
          title={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.organizationStats.organizationalSources',
            { defaultMessage: 'Organizational sources' }
          )}
          count={sourcesCount}
          actionPath={SOURCES_PATH}
        />
        <StatisticCard
          title={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.organizationStats.invitations',
            { defaultMessage: 'Invitations' }
          )}
          count={pendingInvitationsCount}
          actionPath={USERS_AND_ROLES_PATH}
        />
        <StatisticCard
          title={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.organizationStats.activeUsers',
            { defaultMessage: 'Active users' }
          )}
          count={accountsCount}
          actionPath={USERS_AND_ROLES_PATH}
        />
        <StatisticCard
          title={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.organizationStats.privateSources',
            { defaultMessage: 'Private sources' }
          )}
          count={privateSourcesCount}
        />
      </EuiFlexGrid>
    </ContentSection>
  );
};
