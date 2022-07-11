/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { UseQueryResult } from 'react-query';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { NoDataPage } from '@kbn/kibana-react-plugin/public';
import { css } from '@emotion/react';
import { CspLoadingState } from './csp_loading_state';
import { useCisKubernetesIntegration } from '../common/api/use_cis_kubernetes_integration';
import { useCISIntegrationLink } from '../common/navigation/use_navigate_to_cis_integration';

export const LOADING_STATE_TEST_SUBJECT = 'csp_setup_status_loading';
export const ERROR_STATE_TEST_SUBJECT = 'csp_setup_status_error';
export const PACKAGE_NOT_INSTALLED_TEST_SUBJECT = 'csp_setup_status_package_not_installed';
export const DEFAULT_NO_DATA_TEST_SUBJECT = 'csp_setup_status_no_data';

interface CommonError {
  body: {
    error: string;
    message: string;
    statusCode: number;
  };
}

export const isCommonError = (error: any): error is CommonError => {
  if (!error?.body) return false;

  const {
    body: { error: innerError, message, statusCode },
  } = error;

  return !!(innerError && message && statusCode);
};

const packageNotInstalledRenderer = (cisIntegrationLink?: string) => (
  <NoDataPage
    data-test-subj={PACKAGE_NOT_INSTALLED_TEST_SUBJECT}
    css={css`
      max-width: 950px;
      margin-top: 50px;
      margin-left: auto;
      margin-right: auto;
    `}
    pageTitle={i18n.translate('xpack.csp.setupStatus.packageNotInstalled.pageTitle', {
      defaultMessage: 'Install Integration to get started',
    })}
    solution={i18n.translate('xpack.csp.setupStatus.packageNotInstalled.solutionNameLabel', {
      defaultMessage: 'Cloud Security Posture',
    })}
    // TODO: Add real docs link once we have it
    docsLink={'https://www.elastic.co/guide/index.html'}
    logo={'logoSecurity'}
    actions={{
      elasticAgent: {
        href: cisIntegrationLink,
        isDisabled: !cisIntegrationLink,
        title: i18n.translate('xpack.csp.setupStatus.packageNotInstalled.buttonLabel', {
          defaultMessage: 'Add a CIS integration',
        }),
        description: i18n.translate('xpack.csp.setupStatus.packageNotInstalled.description', {
          defaultMessage:
            'Use our CIS Kubernetes Benchmark integration to measure your Kubernetes cluster setup against the CIS recommendations.',
        }),
      },
    }}
  />
);

const defaultLoadingRenderer = () => (
  <CspLoadingState data-test-subj={LOADING_STATE_TEST_SUBJECT}>
    <FormattedMessage id="xpack.csp.setupStatus.loadingDescription" defaultMessage="Loading..." />
  </CspLoadingState>
);

const defaultErrorRenderer = (error: unknown) => (
  <EuiEmptyPrompt
    css={css`
      margin-top: 50px;
    `}
    color="danger"
    iconType="alert"
    data-test-subj={ERROR_STATE_TEST_SUBJECT}
    title={
      <h2>
        <FormattedMessage
          id="xpack.csp.setupStatus.errorRenderer.errorTitle"
          defaultMessage="We couldn't fetch your cloud security posture data"
        />
      </h2>
    }
    body={
      isCommonError(error) ? (
        <p>
          <FormattedMessage
            id="xpack.csp.setupStatus.errorRenderer.errorDescription"
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
);

const defaultNoDataRenderer = () => {
  return (
    <NoDataPage
      data-test-subj={DEFAULT_NO_DATA_TEST_SUBJECT}
      css={css`
        margin-top: 50px;
      `}
      pageTitle={i18n.translate('xpack.csp.setupStatus.defaultNoDataConfig.pageTitle', {
        defaultMessage: 'No data found',
      })}
      solution={i18n.translate('xpack.csp.setupStatus.defaultNoDataConfig.solutionNameLabel', {
        defaultMessage: 'Cloud Security Posture',
      })}
      // TODO: Add real docs link once we have it
      docsLink={'https://www.elastic.co/guide/index.html'}
      logo={'logoSecurity'}
      actions={{}}
    />
  );
};

interface SetupStatusProps<TData, TError> {
  children: React.ReactNode;
  query?: UseQueryResult<TData, TError>;
  loadingRender?: () => React.ReactNode;
  errorRender?: (error: TError) => React.ReactNode;
  noDataRenderer?: () => React.ReactNode;
}

export const SetupStatus = <TData, TError>({
  children,
  query,
  loadingRender = defaultLoadingRenderer,
  errorRender = defaultErrorRenderer,
  noDataRenderer = defaultNoDataRenderer,
}: SetupStatusProps<TData, TError>) => {
  const cisKubernetesPackageInfo = useCisKubernetesIntegration();
  const cisIntegrationLink = useCISIntegrationLink();

  const render = () => {
    if (cisKubernetesPackageInfo.isError) {
      return defaultErrorRenderer(cisKubernetesPackageInfo.error);
    }

    if (cisKubernetesPackageInfo.isLoading || cisKubernetesPackageInfo.isIdle) {
      return defaultLoadingRenderer();
    }

    if (cisKubernetesPackageInfo.data.item.status !== 'installed') {
      return packageNotInstalledRenderer(cisIntegrationLink);
    }

    if (!query) {
      return children;
    }

    if (query.isError) {
      return errorRender(query.error);
    }

    if (query.isLoading || query.isIdle) {
      return loadingRender();
    }

    if (!query.data) {
      return noDataRenderer();
    }

    return children;
  };

  return <>{render()}</>;
};
