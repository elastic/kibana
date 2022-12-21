/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate, EuiButton, EuiTitle, EuiLink, EuiImage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import illustration from './assets/illustration.svg';

export function SloListWelcomePrompt() {
  return (
    <EuiPageTemplate minHeight="0" data-test-subj="slosPageWelcomePrompt">
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

            <p>
              {i18n.translate('xpack.observability.slos.sloList.welcomePrompt.messageParagraph3', {
                defaultMessage: 'To get started, create your first SLO.',
              })}
            </p>
          </>
        }
        actions={
          <EuiButton color="primary" fill>
            {i18n.translate('xpack.observability.slos.sloList.welcomePrompt.buttonLabel', {
              defaultMessage: 'Create first SLO',
            })}
          </EuiButton>
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
