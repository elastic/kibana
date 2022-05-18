/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { SecurityPageName } from '../../app/types';
import { HeaderPage } from '../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { LandingLinksImages, NavItem } from '../components/landing_links_images';
import { THREAT_HUNTING_PAGE_TITLE } from './translations';
import userPageImg from '../../common/images/users_page.png';
import hostsPageImg from '../../common/images/hosts_page.png';
import networkPageImg from '../../common/images/network_page.png';
import { HOSTS, NETWORK, USERS } from '../../app/translations';

const items: NavItem[] = [
  {
    id: SecurityPageName.hosts,
    label: HOSTS,
    description: i18n.translate('xpack.securitySolution.landing.threatHunting.hostsDescription', {
      defaultMessage:
        'Computer or other device that communicates with other hosts on a network. Hosts on a network include clients and servers -- that send or receive data, services or applications.',
    }),
    image: hostsPageImg,
  },
  {
    id: SecurityPageName.network,
    label: NETWORK,
    description: i18n.translate('xpack.securitySolution.landing.threatHunting.networkDescription', {
      defaultMessage:
        'The action or process of interacting with others to exchange information and develop professional or social contacts.',
    }),
    image: networkPageImg,
  },
  {
    id: SecurityPageName.users,
    label: USERS,
    description: i18n.translate('xpack.securitySolution.landing.threatHunting.usersDescription', {
      defaultMessage: 'Sudo commands dashboard from the Logs System integration.',
    }),
    image: userPageImg,
  },
];

export const ThreatHuntingLandingPage = () => (
  <SecuritySolutionPageWrapper>
    <HeaderPage title={THREAT_HUNTING_PAGE_TITLE} />
    <LandingLinksImages items={items} />
    <SpyRoute pageName={SecurityPageName.threatHuntingLanding} />
  </SecuritySolutionPageWrapper>
);
