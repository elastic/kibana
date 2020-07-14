/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGrid } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { ContentSection } from '../shared/content_section';
import { ORG_SOURCES_PATH, USERS_PATH } from '../../routes';

import { IAppServerData } from './overview';

import { StatisticCard } from './statistic_card';

export const OrganizationStats: React.FC<IAppServerData> = ({
  sourcesCount,
  pendingInvitationsCount,
  accountsCount,
  personalSourcesCount,
  isFederatedAuth,
}) => (
  <ContentSection
    title={
      <FormattedMessage
        id="xpack.enterpriseSearch.workplaceSearch.organizationStats.title"
        defaultMessage="Usage statistics"
      />
    }
    headerSpacer="m"
  >
    <EuiFlexGrid columns={isFederatedAuth ? 2 : 4}>
      <StatisticCard
        title={i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.organizationStats.sharedSources',
          { defaultMessage: 'Shared sources' }
        )}
        count={sourcesCount}
        actionPath={ORG_SOURCES_PATH}
      />
      {!isFederatedAuth && (
        <>
          <StatisticCard
            title={i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.organizationStats.invitations',
              { defaultMessage: 'Invitations' }
            )}
            count={pendingInvitationsCount}
            actionPath={USERS_PATH}
          />
          <StatisticCard
            title={i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.organizationStats.activeUsers',
              { defaultMessage: 'Active users' }
            )}
            count={accountsCount}
            actionPath={USERS_PATH}
          />
        </>
      )}
      <StatisticCard
        title={i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.organizationStats.privateSources',
          { defaultMessage: 'Private sources' }
        )}
        count={personalSourcesCount}
      />
    </EuiFlexGrid>
  </ContentSection>
);
