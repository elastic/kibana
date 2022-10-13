/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiButton, EuiCallOut, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import { docLinks } from '../../../../shared/doc_links';
import { PageTemplateProps } from '../../../../shared/layout';
import { AppLogic } from '../../../app_logic';
import { WorkplaceSearchPageTemplate, PersonalDashboardLayout } from '../../../components/layout';
import { NAV } from '../../../constants';

import {
  DOWNLOAD_DIAGNOSTIC_BUTTON,
  SOURCE_DISABLED_CALLOUT_TITLE,
  SOURCE_DISABLED_CALLOUT_DESCRIPTION,
  SOURCE_DISABLED_CALLOUT_BUTTON,
} from '../constants';
import { SourceLogic } from '../source_logic';

import { DownloadDiagnosticsButton } from './download_diagnostics_button';
import { SourceInfoCard } from './source_info_card';

export const SourceLayout: React.FC<PageTemplateProps> = ({
  children,
  pageChrome = [],
  ...props
}) => {
  const { contentSource, dataLoading, diagnosticDownloadButtonVisible } = useValues(SourceLogic);
  const { isOrganization } = useValues(AppLogic);

  const { name, supportedByLicense } = contentSource;

  const pageHeader = (
    <>
      <SourceInfoCard contentSource={contentSource} />
      <EuiHorizontalRule />
    </>
  );

  const callout = (
    <>
      <EuiCallOut title={SOURCE_DISABLED_CALLOUT_TITLE} color="warning" iconType="alert">
        <p>{SOURCE_DISABLED_CALLOUT_DESCRIPTION}</p>
        <EuiButton color="warning" href={docLinks.licenseManagement}>
          {SOURCE_DISABLED_CALLOUT_BUTTON}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );

  const downloadDiagnosticButton = (
    <>
      <DownloadDiagnosticsButton label={DOWNLOAD_DIAGNOSTIC_BUTTON} />
      <EuiSpacer size="xl" />
    </>
  );

  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;

  return (
    <Layout
      isLoading={dataLoading}
      {...props}
      pageChrome={[NAV.SOURCES, name || '...', ...pageChrome]}
    >
      {diagnosticDownloadButtonVisible && downloadDiagnosticButton}
      {!supportedByLicense && callout}
      {pageHeader}
      {children}
    </Layout>
  );
};
