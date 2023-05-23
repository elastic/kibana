/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';

import { SecurityPageName } from '../../app/types';
import { LandingLinksIconsCategoriesPage } from '../../common/components/landing_links/landing_links_icons_categories';

const MANAGE_PAGE_TITLE = i18n.translate('xpack.securitySolution.management.landing.pageTitle', {
  defaultMessage: 'Manage',
});

export const ManageLandingPage = () => (
  <LandingLinksIconsCategoriesPage
    title={MANAGE_PAGE_TITLE}
    pageName={SecurityPageName.administration}
  />
);
