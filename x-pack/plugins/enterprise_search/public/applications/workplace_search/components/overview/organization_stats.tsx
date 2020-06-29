/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

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
  <ContentSection title="Usage statistics" headerSpacer="m">
    <div
      className={`euiFlexGrid euiFlexGrid--gutterLarge euiFlexGrid--${
        isFederatedAuth ? 'halves' : 'fourths'
      }`}
    >
      <StatisticCard title="Shared sources" count={sourcesCount} actionPath={ORG_SOURCES_PATH} />
      {!isFederatedAuth && (
        <>
          <StatisticCard
            title="Invitations"
            count={pendingInvitationsCount}
            actionPath={USERS_PATH}
          />
          <StatisticCard title="Active users" count={accountsCount} actionPath={USERS_PATH} />
        </>
      )}
      <StatisticCard title="Private sources" count={personalSourcesCount} />
    </div>
  </ContentSection>
);
