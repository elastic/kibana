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
  EuiTitle,
  EuiLink,
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
  pageTitle: i18n.translate('xpack.upgradeAssistant.overview.pageTitle', {
    defaultMessage: 'Upgrade Assistant',
  }),
  pageDescription: i18n.translate('xpack.upgradeAssistant.overview.pageDescription', {
    defaultMessage:
      'Prepare to upgrade by identifying deprecated settings and updating your configuration.',
  }),
  docLink: i18n.translate('xpack.upgradeAssistant.overview.documentationLinkText', {
    defaultMessage: 'Documentation',
  }),
  deprecationLoggingTitle: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLoggingTitle',
    {
      defaultMessage: 'Deprecation logs',
    }
  ),
  getDeprecationLoggingDescription: (nextMajor: string, href: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.deprecationLoggingDescription"
      defaultMessage="Enable {deprecationLoggingLink} to see if you are using deprecated features that will not be available after you upgrade to Elastic {nextMajor}."
      values={{
        nextMajor,
        deprecationLoggingLink: (
          <EuiLink href={href} target="_blank">
            {i18n.translate(
              'xpack.upgradeAssistant.deprecationLoggingDescription.deprecationLoggingLink',
              {
                defaultMessage: 'deprecation logging',
              }
            )}
          </EuiLink>
        ),
      }}
    />
  ),
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
              <p>{i18nTexts.pageDescription}</p>
            </EuiText>

            <EuiSpacer />

            {/* Remove this in last minor of the current major (e.g., 7.15) */}
            <LatestMinorBanner />

            <EuiSpacer size="xl" />

            {/* Deprecation stats */}
            <EuiFlexGroup>
              <EuiFlexItem>
                <ESDeprecationStats history={history} />
              </EuiFlexItem>

              <EuiFlexItem>
                <KibanaDeprecationStats history={history} />
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer />

            {/* Deprecation logging */}
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2>{i18nTexts.deprecationLoggingTitle}</h2>
                </EuiTitle>

                <EuiText>
                  <p>
                    {i18nTexts.getDeprecationLoggingDescription(
                      `${nextMajor}.x`,
                      docLinks.links.elasticsearch.deprecationLogging
                    )}
                  </p>
                </EuiText>

                <EuiSpacer size="m" />

                <DeprecationLoggingToggle />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};
