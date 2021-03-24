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
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { RouteComponentProps } from 'react-router-dom';
import { useAppContext } from '../../app_context';
import { LatestMinorBanner } from '../latest_minor_banner';
import { ESDeprecationStats } from './es_stats';
import { DeprecationLoggingToggle } from './deprecation_logging_toggle';

const i18nTexts = {
  pageTitle: i18n.translate('xpack.upgradeAssistant.pageTitle', {
    defaultMessage: 'Upgrade Assistant',
  }),
  pageDescription: (nextMajor: string) =>
    i18n.translate('xpack.upgradeAssistant.pageDescription', {
      defaultMessage:
        'The Upgrade Assistant identifies deprecated settings in your cluster and helps you resolve issues before you upgrade to Elastic {nextMajor}.',
      values: {
        nextMajor,
      },
    }),
  deprecationLoggingTitle: i18n.translate('xpack.upgradeAssistant.deprecationLoggingTitle', {
    defaultMessage: 'Review deprecation logs',
  }),
  deprecationLoggingDescription: (href: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.deprecationLoggingDescription"
      defaultMessage="For other issues that need your attention, review the deprecation logs. You may need to enable deprecation logging. {learnMore}"
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
    defaultMessage: 'Upgrade Assistant docs',
  }),
};

interface Props {
  history: RouteComponentProps['history'];
}

export const DeprecationsOverview: FunctionComponent<Props> = ({ history }) => {
  // TODO
  // const [telemetryState, setTelemetryState] = useState<TelemetryState>(TelemetryState.Complete);

  const { kibanaVersionInfo, breadcrumbs, docLinks } = useAppContext();
  const { nextMajor } = kibanaVersionInfo;

  // useEffect(() => {
  //   if (isLoading === false) {
  //     setTelemetryState(TelemetryState.Running);

  //     async function sendTelemetryData() {
  //       await api.sendTelemetryData({
  //         overview: true,
  //       });
  //       setTelemetryState(TelemetryState.Complete);
  //     }

  //     sendTelemetryData();
  //   }
  // }, [api, isLoading]);

  useEffect(() => {
    breadcrumbs.setBreadcrumbs('overview');
  }, [breadcrumbs]);

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiPageHeader
          pageTitle={i18nTexts.pageTitle}
          rightSideItems={[
            <EuiButtonEmpty
              // TODO add doc link
              href={'#'}
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
              <p>{i18nTexts.pageDescription(`${nextMajor}.x`)}</p>
            </EuiText>

            <EuiSpacer />

            <EuiCallOut title={i18nTexts.deprecationLoggingTitle} iconType="pin">
              <p>
                {i18nTexts.deprecationLoggingDescription(
                  docLinks.links.elasticsearch.deprecationLogging
                )}
              </p>

              <DeprecationLoggingToggle />
            </EuiCallOut>

            <EuiSpacer />

            {/* Remove this in last minor of the current major (e.g., 7.15) */}
            <LatestMinorBanner />

            <EuiSpacer size="xl" />

            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <ESDeprecationStats history={history} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};
