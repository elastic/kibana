/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { UseQueryResult } from '@tanstack/react-query';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { NoDataPage } from '@kbn/kibana-react-plugin/public';
import { css } from '@emotion/react';
import { FullSizeCenteredPage } from './full_size_centered_page';
import { useCspSetupStatusApi } from '../common/api/use_setup_status_api';
import { CspLoadingState } from './csp_loading_state';
import { useCISIntegrationLink } from '../common/navigation/use_navigate_to_cis_integration';

export const LOADING_STATE_TEST_SUBJECT = 'cloud_posture_page_loading';
export const ERROR_STATE_TEST_SUBJECT = 'cloud_posture_page_error';
export const PACKAGE_NOT_INSTALLED_TEST_SUBJECT = 'cloud_posture_page_package_not_installed';
export const DEFAULT_NO_DATA_TEST_SUBJECT = 'cloud_posture_page_no_data';

interface CommonError {
  body: {
    error: string;
    message: string;
    statusCode: number;
  };
}

export const isCommonError = (error: unknown): error is CommonError => {
  if (
    !(error as any)?.body ||
    !(error as any)?.body?.error ||
    !(error as any)?.body?.message ||
    !(error as any)?.body?.statusCode
  ) {
    return false;
  }

  return true;
};

const packageNotInstalledRenderer = (cisIntegrationLink?: string) => (
  <FullSizeCenteredPage>
    <NoDataPage
      data-test-subj={PACKAGE_NOT_INSTALLED_TEST_SUBJECT}
      css={css`
        max-width: 950px;
      `}
      pageTitle={i18n.translate('xpack.csp.cloudPosturePage.packageNotInstalled.pageTitle', {
        defaultMessage: 'Install Integration to get started',
      })}
      solution={i18n.translate('xpack.csp.cloudPosturePage.packageNotInstalled.solutionNameLabel', {
        defaultMessage: 'Cloud Security Posture',
      })}
      // TODO: Add real docs link once we have it
      docsLink={'https://www.elastic.co/guide/index.html'}
      logo={'logoSecurity'}
      actions={{
        elasticAgent: {
          href: cisIntegrationLink,
          isDisabled: !cisIntegrationLink,
          title: i18n.translate('xpack.csp.cloudPosturePage.packageNotInstalled.buttonLabel', {
            defaultMessage: 'Add a CIS integration',
          }),
          description: i18n.translate(
            'xpack.csp.cloudPosturePage.packageNotInstalled.description',
            {
              defaultMessage:
                'Use our CIS Kubernetes Benchmark integration to measure your Kubernetes cluster setup against the CIS recommendations.',
            }
          ),
        },
      }}
    />
  </FullSizeCenteredPage>
);

const defaultLoadingRenderer = () => (
  <CspLoadingState data-test-subj={LOADING_STATE_TEST_SUBJECT}>
    <FormattedMessage
      id="xpack.csp.cloudPosturePage.loadingDescription"
      defaultMessage="Loading..."
    />
  </CspLoadingState>
);

const defaultErrorRenderer = (error: unknown) => (
  <FullSizeCenteredPage>
    <EuiEmptyPrompt
      color="danger"
      iconType="alert"
      data-test-subj={ERROR_STATE_TEST_SUBJECT}
      title={
        <h2>
          <FormattedMessage
            id="xpack.csp.cloudPosturePage.errorRenderer.errorTitle"
            defaultMessage="We couldn't fetch your cloud security posture data"
          />
        </h2>
      }
      body={
        isCommonError(error) ? (
          <p>
            <FormattedMessage
              id="xpack.csp.cloudPosturePage.errorRenderer.errorDescription"
              defaultMessage="{error} {statusCode}: {body}"
              values={{
                error: error.body.error,
                statusCode: error.body.statusCode,
                body: error.body.message,
              }}
            />
          </p>
        ) : undefined
      }
    />
  </FullSizeCenteredPage>
);

const defaultNoDataRenderer = () => {
  return (
    <FullSizeCenteredPage>
      <NoDataPage
        data-test-subj={DEFAULT_NO_DATA_TEST_SUBJECT}
        pageTitle={i18n.translate('xpack.csp.cloudPosturePage.defaultNoDataConfig.pageTitle', {
          defaultMessage: 'No data found',
        })}
        solution={i18n.translate(
          'xpack.csp.cloudPosturePage.defaultNoDataConfig.solutionNameLabel',
          {
            defaultMessage: 'Cloud Security Posture',
          }
        )}
        // TODO: Add real docs link once we have it
        docsLink={'https://www.elastic.co/guide/index.html'}
        logo={'logoSecurity'}
        actions={{}}
      />
    </FullSizeCenteredPage>
  );
};

interface CloudPosturePageProps<TData, TError> {
  children: React.ReactNode;
  query?: UseQueryResult<TData, TError>;
  loadingRender?: () => React.ReactNode;
  errorRender?: (error: TError) => React.ReactNode;
  noDataRenderer?: () => React.ReactNode;
}

export const CloudPosturePage = <TData, TError>({
  children,
  query,
  loadingRender = defaultLoadingRenderer,
  errorRender = defaultErrorRenderer,
  noDataRenderer = defaultNoDataRenderer,
}: CloudPosturePageProps<TData, TError>) => {
  const getSetupStatus = useCspSetupStatusApi();
  const cisIntegrationLink = useCISIntegrationLink();

  const render = () => {
    if (getSetupStatus.isError) {
      return defaultErrorRenderer(getSetupStatus.error);
    }

    if (getSetupStatus.isLoading) {
      return defaultLoadingRenderer();
    }

    if (getSetupStatus.data.status === 'not-installed') {
      return packageNotInstalledRenderer(cisIntegrationLink);
    }

    if (!query) {
      return children;
    }

    if (query.isError) {
      return errorRender(query.error);
    }

    if (query.isLoading) {
      return loadingRender();
    }

    if (!query.data) {
      return noDataRenderer();
    }

    return children;
  };

  return <>{render()}</>;
};
