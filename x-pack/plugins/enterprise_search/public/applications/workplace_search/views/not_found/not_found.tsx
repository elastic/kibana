/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { PageTemplateProps } from '../../../shared/layout';
import { NotFoundPrompt } from '../../../shared/not_found';
import { SendWorkplaceSearchTelemetry } from '../../../shared/telemetry';
import { WorkplaceSearchPageTemplate, PersonalDashboardLayout } from '../../components/layout';
import { PRIVATE_SOURCES_PATH } from '../../routes';

interface Props {
  isOrganization?: boolean;
  pageChrome?: PageTemplateProps['pageChrome'];
}
export const NotFound: React.FC<Props> = ({ isOrganization = true, pageChrome = [] }) => {
  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;

  return (
    <Layout pageChrome={[...pageChrome, '404']} customPageSections>
      <SendWorkplaceSearchTelemetry action="error" metric="not_found" />
      <NotFoundPrompt
        backToLink={!isOrganization ? PRIVATE_SOURCES_PATH : '/'}
        productSupportUrl={WORKPLACE_SEARCH_PLUGIN.SUPPORT_URL}
      />
    </Layout>
  );
};
