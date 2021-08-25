/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import { EuiPageHeader, EuiSpacer, EuiPageContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SectionLoading } from '../../../shared_imports';
import { useAppContext } from '../../app_context';
import { EsDeprecationsTable } from './es_deprecations_table';
import { EsDeprecationErrors } from './es_deprecation_errors';
import { NoDeprecationsPrompt } from '../shared';

const i18nTexts = {
  pageTitle: i18n.translate('xpack.upgradeAssistant.esDeprecations.pageTitle', {
    defaultMessage: 'Elasticsearch deprecation warnings',
  }),
  pageDescription: i18n.translate('xpack.upgradeAssistant.esDeprecations.pageDescription', {
    defaultMessage:
      'You must resolve all critical issues before upgrading. Back up recommended. Make sure you have a current snapshot before modifying your configuration or reindexing.',
  }),
  isLoading: i18n.translate('xpack.upgradeAssistant.esDeprecations.loadingText', {
    defaultMessage: 'Loading deprecations…',
  }),
};

export const EsDeprecations = withRouter(({ history }: RouteComponentProps) => {
  const { api, breadcrumbs } = useAppContext();

  const {
    data: esDeprecations,
    isLoading,
    error,
    resendRequest,
    isInitialRequest,
  } = api.useLoadEsDeprecations();

  useEffect(() => {
    breadcrumbs.setBreadcrumbs('esDeprecations');
  }, [breadcrumbs]);

  useEffect(() => {
    if (isLoading === false && isInitialRequest) {
      async function sendTelemetryData() {
        await api.sendPageTelemetryData({
          elasticsearch: true,
        });
      }

      sendTelemetryData();
    }
  }, [api, isLoading, isInitialRequest]);

  if (error) {
    return <EsDeprecationErrors error={error} />;
  }

  if (isLoading) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <SectionLoading>{i18nTexts.isLoading}</SectionLoading>
      </EuiPageContent>
    );
  }

  if (esDeprecations?.deprecations?.length === 0) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <NoDeprecationsPrompt
          deprecationType="Elasticsearch"
          navigateToOverviewPage={() => history.push('/overview')}
        />
      </EuiPageContent>
    );
  }

  return (
    <div data-test-subj="esDeprecationsContent">
      <EuiPageHeader pageTitle={i18nTexts.pageTitle} description={i18nTexts.pageDescription} />

      <EuiSpacer size="l" />

      <EsDeprecationsTable deprecations={esDeprecations?.deprecations} reload={resendRequest} />
    </div>
  );
});
