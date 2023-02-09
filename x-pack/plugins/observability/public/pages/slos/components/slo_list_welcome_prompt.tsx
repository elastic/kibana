/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPageTemplate,
  EuiButton,
  EuiTitle,
  EuiLink,
  EuiImage,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useKibana } from '../../../utils/kibana_react';
import { useLicense } from '../../../hooks/use_license';
import { paths } from '../../../config';
import illustration from './assets/illustration.svg';

export function SloListWelcomePrompt() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const { hasAtLeast } = useLicense();

  const hasRightLicense = hasAtLeast('platinum');

  const handleClickCreateSlo = () => {
    navigateToUrl(basePath.prepend(paths.observability.sloCreate));
  };

  return (
    <EuiPageTemplate
      minHeight="0"
      data-test-subj="slosPageWelcomePrompt"
      style={{ paddingBlockStart: 0 }}
    >
      <EuiPageTemplate.EmptyPrompt
        title={
          <EuiTitle size="l">
            <h1>
              {i18n.translate('xpack.observability.slos.sloList.welcomePrompt.title', {
                defaultMessage: 'Track and deliver on your SLOs',
              })}
            </h1>
          </EuiTitle>
        }
        icon={<EuiImage size="fullWidth" src={illustration} alt="" />}
        color="transparent"
        layout="horizontal"
        hasBorder={false}
        body={
          <>
            <p>
              {i18n.translate('xpack.observability.slos.sloList.welcomePrompt.messageParagraph1', {
                defaultMessage:
                  'Measure key metrics important to the business, such as service-level indicators and service-level objectives (SLIs/SLOs) to deliver on SLAs.',
              })}
            </p>

            <p>
              {i18n.translate('xpack.observability.slos.sloList.welcomePrompt.messageParagraph2', {
                defaultMessage:
                  'Easily report the uptime and reliability of your services to stakeholders with real-time insights.',
              })}
            </p>
            <EuiSpacer size="s" />
          </>
        }
        actions={
          <>
            {hasRightLicense ? (
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiTitle size="xxs">
                    <span>
                      {i18n.translate(
                        'xpack.observability.slos.sloList.welcomePrompt.getStartedMessage',
                        {
                          defaultMessage: 'To get started, create your first SLO.',
                        }
                      )}
                    </span>
                  </EuiTitle>
                </EuiFlexItem>

                <EuiFlexItem>
                  <span>
                    <EuiButton fill color="primary" onClick={handleClickCreateSlo}>
                      {i18n.translate(
                        'xpack.observability.slos.sloList.welcomePrompt.buttonLabel',
                        {
                          defaultMessage: 'Create SLO',
                        }
                      )}
                    </EuiButton>
                  </span>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiTitle size="xxs">
                    <span>
                      {i18n.translate(
                        'xpack.observability.slos.sloList.welcomePrompt.needLicenseMessage',
                        {
                          defaultMessage:
                            'You need an Elastic Cloud subscription or Platinum license to use SLOs.',
                        }
                      )}
                    </span>
                  </EuiTitle>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup direction="row">
                    <EuiFlexItem>
                      <EuiButton
                        fill
                        href="https://www.elastic.co/cloud/elasticsearch-service/signup"
                        target="_blank"
                        data-test-subj="slosPageWelcomePromptSignupForCloudButton"
                      >
                        {i18n.translate(
                          'xpack.observability.slos.sloList.welcomePrompt.signupForCloud',
                          {
                            defaultMessage: 'Sign up for Elastic Cloud',
                          }
                        )}
                      </EuiButton>
                    </EuiFlexItem>

                    <EuiFlexItem>
                      <EuiButton
                        href="https://www.elastic.co/subscriptions"
                        target="_blank"
                        data-test-subj="slosPageWelcomePromptSignupForLicenseButton"
                      >
                        {i18n.translate(
                          'xpack.observability.slos.sloList.welcomePrompt.signupForLicense',
                          {
                            defaultMessage: 'Sign up for license',
                          }
                        )}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </>
        }
        footer={
          <>
            <EuiTitle size="xxs">
              <span>
                {i18n.translate('xpack.observability.slos.sloList.welcomePrompt.learnMore', {
                  defaultMessage: 'Want to learn more?',
                })}
              </span>
            </EuiTitle>
            &nbsp;
            <EuiLink href="#" target="_blank">
              {i18n.translate('xpack.observability.slos.sloList.welcomePrompt.learnMoreLink', {
                defaultMessage: 'Read the docs',
              })}
            </EuiLink>
          </>
        }
      />
    </EuiPageTemplate>
  );
}
