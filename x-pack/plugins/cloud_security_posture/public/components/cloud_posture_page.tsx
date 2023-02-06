/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiImage,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { NoDataPage, NoDataPageProps } from '@kbn/kibana-react-plugin/public';
import { css } from '@emotion/react';
import { CSPM_POLICY_TEMPLATE, KSPM_POLICY_TEMPLATE } from '../../common/constants';
import { SubscriptionNotAllowed } from './subscription_not_allowed';
import { useSubscriptionStatus } from '../common/hooks/use_subscription_status';
import { FullSizeCenteredPage } from './full_size_centered_page';
import { useCspSetupStatusApi } from '../common/api/use_setup_status_api';
import { CspLoadingState } from './csp_loading_state';
import { useCspIntegrationLink } from '../common/navigation/use_csp_integration_link';

import noDataIllustration from '../assets/illustrations/no_data_illustration.svg';

export const LOADING_STATE_TEST_SUBJECT = 'cloud_posture_page_loading';
export const ERROR_STATE_TEST_SUBJECT = 'cloud_posture_page_error';
export const PACKAGE_NOT_INSTALLED_TEST_SUBJECT = 'cloud_posture_page_package_not_installed';
export const CSPM_INTEGRATION_NOT_INSTALLED_TEST_SUBJECT = 'cloud_posture_page_cspm_not_installed';
export const KSPM_INTEGRATION_NOT_INSTALLED_TEST_SUBJECT = 'cloud_posture_page_kspm_not_installed';
export const DEFAULT_NO_DATA_TEST_SUBJECT = 'cloud_posture_page_no_data';
export const SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT = 'cloud_posture_page_subscription_not_allowed';

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

export interface CspNoDataPageProps {
  pageTitle: NoDataPageProps['pageTitle'];
  docsLink: NoDataPageProps['docsLink'];
  actionHref: NoDataPageProps['actions']['elasticAgent']['href'];
  actionTitle: NoDataPageProps['actions']['elasticAgent']['title'];
  actionDescription: NoDataPageProps['actions']['elasticAgent']['description'];
  testId: string;
}

export const CspNoDataPage = ({
  pageTitle,
  docsLink,
  actionHref,
  actionTitle,
  actionDescription,
  testId,
}: CspNoDataPageProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <NoDataPage
      data-test-subj={testId}
      css={css`
        div:nth-child(3) {
          display: block;
          margin: auto;
          width: 450px;
          button {
            margin: 0 auto;
            margin-top: ${euiTheme.size.base};
          }
        }
      `}
      pageTitle={pageTitle}
      solution={i18n.translate('xpack.csp.cloudPosturePage.packageNotInstalled.solutionNameLabel', {
        defaultMessage: 'Cloud Security Posture',
      })}
      docsLink={docsLink}
      logo="logoSecurity"
      actions={{
        elasticAgent: {
          href: actionHref,
          isDisabled: !actionHref,
          title: actionTitle,
          description: actionDescription,
        },
      }}
    />
  );
};

const packageNotInstalledRenderer = ({
  kspmIntegrationLink,
  cspmIntegrationLink,
}: {
  kspmIntegrationLink?: string;
  cspmIntegrationLink?: string;
}) => {
  return (
    <FullSizeCenteredPage>
      <EuiEmptyPrompt
        data-test-subj={PACKAGE_NOT_INSTALLED_TEST_SUBJECT}
        icon={<EuiImage size="fullWidth" src={noDataIllustration} alt="no-data-illustration" />}
        title={
          <h2>
            <FormattedMessage
              id="xpack.csp.cloudPosturePage.packageNotInstalledRenderer.promptTitle"
              defaultMessage="Detect security misconfigurations in your cloud resources!"
            />
          </h2>
        }
        layout="horizontal"
        color="plain"
        body={
          <p>
            <FormattedMessage
              id="xpack.csp.cloudPosturePage.packageNotInstalledRenderer.promptDescription"
              defaultMessage="Add the Cloud and or Kubernetes Security Posture Management (K/CSPM) integration to begin. {learnMore}."
              values={{
                learnMore: (
                  // TODO: CIS AWS - replace link with general doc for both integartions
                  <EuiLink href="https://ela.st/getting-started-with-kspm">
                    <FormattedMessage
                      id="xpack.csp.cloudPosturePage.packageNotInstalledRenderer.learnMoreTitle"
                      defaultMessage="Learn more about Cloud Security Posture"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        }
        actions={
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton color="primary" fill href={cspmIntegrationLink}>
                <FormattedMessage
                  id="xpack.csp.cloudPosturePage.packageNotInstalledRenderer.addCspmIntegrationButtonTitle"
                  defaultMessage="Add CSPM Integration"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton color="primary" fill href={kspmIntegrationLink}>
                <FormattedMessage
                  id="xpack.csp.cloudPosturePage.packageNotInstalledRenderer.addKspmIntegrationButtonTitle"
                  defaultMessage="Add KSPM Integration"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
    </FullSizeCenteredPage>
  );
};

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

const defaultNoDataRenderer = () => (
  <FullSizeCenteredPage>
    <NoDataPage
      data-test-subj={DEFAULT_NO_DATA_TEST_SUBJECT}
      pageTitle={i18n.translate('xpack.csp.cloudPosturePage.defaultNoDataConfig.pageTitle', {
        defaultMessage: 'No data found',
      })}
      solution={i18n.translate('xpack.csp.cloudPosturePage.defaultNoDataConfig.solutionNameLabel', {
        defaultMessage: 'Cloud Security Posture',
      })}
      // TODO: Add real docs link once we have it
      docsLink={'https://www.elastic.co/guide/index.html'}
      logo={'logoSecurity'}
      actions={{}}
    />
  </FullSizeCenteredPage>
);

const subscriptionNotAllowedRenderer = () => (
  <FullSizeCenteredPage data-test-subj={SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT}>
    <SubscriptionNotAllowed />
  </FullSizeCenteredPage>
);

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
  const subscriptionStatus = useSubscriptionStatus();
  const getSetupStatus = useCspSetupStatusApi();
  const kspmIntegrationLink = useCspIntegrationLink(KSPM_POLICY_TEMPLATE);
  const cspmIntegrationLink = useCspIntegrationLink(CSPM_POLICY_TEMPLATE);

  const render = () => {
    if (subscriptionStatus.isError) {
      return defaultErrorRenderer(subscriptionStatus.error);
    }

    if (subscriptionStatus.isLoading) {
      return defaultLoadingRenderer();
    }

    if (!subscriptionStatus.data) {
      return subscriptionNotAllowedRenderer();
    }

    if (getSetupStatus.isError) {
      return defaultErrorRenderer(getSetupStatus.error);
    }

    if (getSetupStatus.isLoading) {
      return defaultLoadingRenderer();
    }

    if (getSetupStatus.data.status === 'not-installed') {
      return packageNotInstalledRenderer({ kspmIntegrationLink, cspmIntegrationLink });
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
