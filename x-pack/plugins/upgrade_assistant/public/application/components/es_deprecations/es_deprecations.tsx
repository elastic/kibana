/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import { EuiPageHeader, EuiSpacer, EuiPageContent, EuiLink, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DocLinksStart } from '@kbn/core/public';
import { METRIC_TYPE } from '@kbn/analytics';

import { EnrichedDeprecationInfo } from '../../../../common/types';
import { SectionLoading } from '../../../shared_imports';
import { useAppContext } from '../../app_context';
import { uiMetricService, UIM_ES_DEPRECATIONS_PAGE_LOAD } from '../../lib/ui_metric';
import { getEsDeprecationError } from '../../lib/get_es_deprecation_error';
import { DeprecationsPageLoadingError, NoDeprecationsPrompt, DeprecationCount } from '../shared';
import { EsDeprecationsTable } from './es_deprecations_table';

const getDeprecationCountByLevel = (deprecations: EnrichedDeprecationInfo[]) => {
  const criticalDeprecations: EnrichedDeprecationInfo[] = [];
  const warningDeprecations: EnrichedDeprecationInfo[] = [];

  deprecations.forEach((deprecation) => {
    if (deprecation.isCritical) {
      criticalDeprecations.push(deprecation);
      return;
    }
    warningDeprecations.push(deprecation);
  });

  return {
    criticalDeprecations: criticalDeprecations.length,
    warningDeprecations: warningDeprecations.length,
  };
};

const i18nTexts = {
  pageTitle: i18n.translate('xpack.upgradeAssistant.esDeprecations.pageTitle', {
    defaultMessage: 'Elasticsearch deprecation issues',
  }),
  pageDescription: i18n.translate('xpack.upgradeAssistant.esDeprecations.pageDescription', {
    defaultMessage:
      'Resolve all critical issues before upgrading. Before making changes, ensure you have a current snapshot of your cluster. Indices created before 7.0 must be reindexed or removed, including hidden indices such as those used to store Machine Learning data.',
  }),
  isLoading: i18n.translate('xpack.upgradeAssistant.esDeprecations.loadingText', {
    defaultMessage: 'Loading deprecation issues…',
  }),
  remoteClustersDetectedTitle: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.remoteClustersDetectedTitle',
    {
      defaultMessage: 'Remote cluster compatibility',
    }
  ),
  getRemoteClustersDetectedDescription: (remoteClustersCount: number) =>
    i18n.translate('xpack.upgradeAssistant.esDeprecations.remoteClustersDetectedDescription', {
      defaultMessage:
        'You have {remoteClustersCount} {remoteClustersCount, plural, one {remote cluster} other {remote clusters}} configured. If you use cross-cluster search, note that 8.x can only search remote clusters running the previous minor version or later. If you use cross-cluster replication, a cluster that contains follower indices must run the same or newer version as the remote cluster.',
      values: {
        remoteClustersCount,
      },
    }),
  remoteClustersLinkText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.remoteClustersLinkText',
    {
      defaultMessage: 'View remote clusters.',
    }
  ),
};

const getBatchReindexLink = (docLinks: DocLinksStart) => {
  return (
    <FormattedMessage
      id="xpack.upgradeAssistant.esDeprecations.batchReindexingDocsDescription"
      defaultMessage="To start multiple reindexing tasks in a single request, use the Kibana {docsLink}."
      values={{
        docsLink: (
          <EuiLink
            href={docLinks.links.upgradeAssistant.batchReindex}
            target="_blank"
            external={true}
          >
            {i18n.translate('xpack.upgradeAssistant.esDeprecations.batchReindexingDocsLink', {
              defaultMessage: 'batch reindexing API',
            })}
          </EuiLink>
        ),
      }}
    />
  );
};

const RemoteClustersAppLink: React.FunctionComponent = () => {
  const {
    plugins: { share },
  } = useAppContext();

  const remoteClustersUrl = share.url.locators
    .get('REMOTE_CLUSTERS_LOCATOR')
    ?.useUrl({ page: 'remoteClusters' });

  return (
    <EuiLink href={remoteClustersUrl} data-test-subj="remoteClustersLink">
      {i18nTexts.remoteClustersLinkText}
    </EuiLink>
  );
};

export const EsDeprecations = withRouter(({ history }: RouteComponentProps) => {
  const {
    services: {
      api,
      breadcrumbs,
      core: { docLinks },
    },
  } = useAppContext();

  const { data: esDeprecations, isLoading, error, resendRequest } = api.useLoadEsDeprecations();
  const { data: remoteClusters } = api.useLoadRemoteClusters();

  const deprecationsCountByLevel: {
    warningDeprecations: number;
    criticalDeprecations: number;
  } = useMemo(
    () => getDeprecationCountByLevel(esDeprecations?.deprecations || []),
    [esDeprecations?.deprecations]
  );

  useEffect(() => {
    breadcrumbs.setBreadcrumbs('esDeprecations');
  }, [breadcrumbs]);

  useEffect(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.LOADED, UIM_ES_DEPRECATIONS_PAGE_LOAD);
  }, []);

  if (error) {
    return (
      <DeprecationsPageLoadingError
        deprecationSource="Elasticsearch"
        message={getEsDeprecationError(error).message}
      />
    );
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
      <EuiPageHeader
        pageTitle={i18nTexts.pageTitle}
        description={
          <>
            {i18nTexts.pageDescription} {getBatchReindexLink(docLinks)}
          </>
        }
      >
        <>
          {remoteClusters && remoteClusters.length > 0 && (
            <>
              <EuiCallOut
                title={i18nTexts.remoteClustersDetectedTitle}
                color="warning"
                iconType="help"
                data-test-subj="remoteClustersWarningCallout"
              >
                <p>
                  {i18nTexts.getRemoteClustersDetectedDescription(remoteClusters.length)}{' '}
                  <RemoteClustersAppLink />
                </p>
              </EuiCallOut>
              <EuiSpacer />
            </>
          )}

          <DeprecationCount
            totalCriticalDeprecations={deprecationsCountByLevel.criticalDeprecations}
            totalWarningDeprecations={deprecationsCountByLevel.warningDeprecations}
          />
        </>
      </EuiPageHeader>

      <EuiSpacer size="l" />

      <EsDeprecationsTable deprecations={esDeprecations?.deprecations} reload={resendRequest} />
    </div>
  );
});
