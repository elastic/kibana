/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';

import {
  EuiSteps,
  EuiText,
  EuiPageHeader,
  EuiButtonEmpty,
  EuiSpacer,
  EuiLink,
  EuiPageBody,
  EuiPageContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { useAppContext } from '../../app_context';
import { getReviewLogsStep } from './review_logs_step';
import { getFixDeprecationLogsStep } from './fix_deprecation_logs_step';
import { getUpgradeStep } from './upgrade_step';

export const Overview: FunctionComponent = () => {
  const { kibanaVersionInfo, breadcrumbs, docLinks, api } = useAppContext();
  const { nextMajor } = kibanaVersionInfo;

  useEffect(() => {
    async function sendTelemetryData() {
      await api.sendPageTelemetryData({
        overview: true,
      });
    }

    sendTelemetryData();
  }, [api]);

  useEffect(() => {
    breadcrumbs.setBreadcrumbs('overview');
  }, [breadcrumbs]);

  return (
    <EuiPageBody restrictWidth={true}>
      <EuiPageContent horizontalPosition="center" color="transparent" paddingSize="none">
        <EuiPageHeader
          bottomBorder
          pageTitle={i18n.translate('xpack.upgradeAssistant.overview.pageTitle', {
            defaultMessage: 'Upgrade Assistant',
          })}
          description={i18n.translate('xpack.upgradeAssistant.overview.pageDescription', {
            defaultMessage: 'Get ready for the next version of the Elastic Stack!',
          })}
          rightSideItems={[
            <EuiButtonEmpty
              href={docLinks.links.upgradeAssistant}
              target="_blank"
              iconType="help"
              data-test-subj="documentationLink"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.overview.documentationLinkText"
                defaultMessage="Documentation"
              />
            </EuiButtonEmpty>,
          ]}
        >
          <EuiText data-test-subj="whatsNewLink">
            <EuiLink href={docLinks.links.elasticsearch.releaseHighlights} target="_blank">
              <FormattedMessage
                id="xpack.upgradeAssistant.overview.whatsNewLink"
                defaultMessage="What's new in version {nextMajor}.0?"
                values={{ nextMajor }}
              />
            </EuiLink>
          </EuiText>
        </EuiPageHeader>

        <EuiSpacer size="l" />

        <EuiSteps
          steps={[
            getReviewLogsStep({ nextMajor }),
            getFixDeprecationLogsStep(),
            getUpgradeStep({ docLinks, nextMajor }),
          ]}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
