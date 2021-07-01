/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';
import moment from 'moment';

import { EuiButton, EuiCallOut, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import { PageTemplateProps } from '../../../../shared/layout';
import { AppLogic } from '../../../app_logic';
import { WorkplaceSearchPageTemplate, PersonalDashboardLayout } from '../../../components/layout';
import { NAV } from '../../../constants';
import { ENT_SEARCH_LICENSE_MANAGEMENT } from '../../../routes';

import {
  SOURCE_DISABLED_CALLOUT_TITLE,
  SOURCE_DISABLED_CALLOUT_DESCRIPTION,
  SOURCE_DISABLED_CALLOUT_BUTTON,
} from '../constants';
import { SourceLogic } from '../source_logic';

import { SourceInfoCard } from './source_info_card';

export const SourceLayout: React.FC<PageTemplateProps> = ({
  children,
  pageChrome = [],
  ...props
}) => {
  const { contentSource, dataLoading } = useValues(SourceLogic);
  const { isOrganization } = useValues(AppLogic);

  const { name, createdAt, serviceType, isFederatedSource, supportedByLicense } = contentSource;

  const pageHeader = (
    <>
      <SourceInfoCard
        sourceName={name}
        sourceType={serviceType}
        dateCreated={moment(createdAt).format('MMMM D, YYYY')}
        isFederatedSource={isFederatedSource}
      />
      <EuiHorizontalRule />
    </>
  );

  const callout = (
    <>
      <EuiCallOut title={SOURCE_DISABLED_CALLOUT_TITLE} color="warning" iconType="alert">
        <p>{SOURCE_DISABLED_CALLOUT_DESCRIPTION}</p>
        <EuiButton color="warning" href={ENT_SEARCH_LICENSE_MANAGEMENT}>
          {SOURCE_DISABLED_CALLOUT_BUTTON}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );

  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;

  return (
    <Layout
      isLoading={dataLoading}
      {...props}
      pageChrome={[NAV.SOURCES, name || '...', ...pageChrome]}
    >
      {!supportedByLicense && callout}
      {pageHeader}
      {children}
    </Layout>
  );
};
