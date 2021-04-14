/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';

import {
  EuiPageContent,
  EuiPageContentBody,
  EuiText,
  EuiPageHeader,
  EuiPageBody,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiLink,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { RouteComponentProps } from 'react-router-dom';
import { useAppContext } from '../../app_context';
import { LatestMinorBanner } from '../latest_minor_banner';
import { ESDeprecationStats } from './es_stats';
import { KibanaDeprecationStats } from './kibana_stats';
import { DeprecationLoggingToggle } from './deprecation_logging_toggle';

const i18nTexts = {
  pageTitle: i18n.translate('xpack.upgradeAssistant.pageTitle', {
    defaultMessage: 'Upgrade Assistant',
  }),
  getPageDescription: (nextMajor: string) =>
    i18n.translate('xpack.upgradeAssistant.pageDescription', {
      defaultMessage:
        'Prepare to upgrade by identifying deprecated settings and updating your configuration. Enable deprecation logging to see if your are using deprecated features that will not be available after you upgrade to Elastic {nextMajor}.',
      values: {
        nextMajor,
      },
    }),
  getDeprecationLoggingLabel: (href: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.deprecationLoggingDescription"
      defaultMessage="Log deprecated actions. {learnMore}"
      values={{
        learnMore: (
          <EuiLink href={href} target="_blank">
            {i18n.translate('xpack.upgradeAssistant.deprecationLoggingDescription.learnMoreLink', {
              defaultMessage: 'Learn more.',
            })}
          </EuiLink>
        ),
      }}
    />
  ),
  docLink: i18n.translate('xpack.upgradeAssistant.documentationLinkText', {
    defaultMessage: 'Documentation',
  }),
};

interface Props {
  history: RouteComponentProps['history'];
}

export const DeprecationsOverview: FunctionComponent<Props> = ({ history }) => {
  const { kibanaVersionInfo, breadcrumbs, docLinks, api } = useAppContext();
  const { nextMajor } = kibanaVersionInfo;

  useEffect(() => {
    async function sendTelemetryData() {
      await api.sendTelemetryData({
        overview: true,
      });
    }

    sendTelemetryData();
  }, [api]);

  useEffect(() => {
    breadcrumbs.setBreadcrumbs('overview');
  }, [breadcrumbs]);

  return (
    <EuiPageBody>
      <EuiPageContent data-test-subj="overviewPageContent">
        <EuiPageHeader
          pageTitle={i18nTexts.pageTitle}
          rightSideItems={[
            <EuiButtonEmpty
              href={docLinks.links.upgradeAssistant}
              target="_blank"
              iconType="help"
              data-test-subj="documentationLink"
            >
              {i18nTexts.docLink}
            </EuiButtonEmpty>,
          ]}
        />

        <EuiPageContentBody>
          <>
            <EuiText data-test-subj="overviewDetail" grow={false}>
              <p>{i18nTexts.getPageDescription(`${nextMajor}.x`)}</p>
            </EuiText>

            <EuiSpacer />

            {/* Remove this in last minor of the current major (e.g., 7.15) */}
            <LatestMinorBanner />

            <EuiSpacer size="xl" />

            <EuiFlexGroup>
              <EuiFlexItem>
                <ESDeprecationStats history={history} />
              </EuiFlexItem>

              <EuiFlexItem>
                <KibanaDeprecationStats history={history} />
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer />

            <EuiFormRow
              helpText={i18nTexts.getDeprecationLoggingLabel(
                docLinks.links.elasticsearch.deprecationLogging
              )}
              data-test-subj="deprecationLoggingFormRow"
            >
              <DeprecationLoggingToggle />
            </EuiFormRow>
          </>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};
