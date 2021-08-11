/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';

import {
  EuiPageContentBody,
  EuiSteps,
  EuiText,
  EuiPageHeader,
  EuiButtonEmpty,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { useAppContext } from '../../app_context';
import { getResolveStep } from './resolve_step';
import { getObserveStep } from './observe_step';
import { getUpgradeStep } from './upgrade_step';

export const DeprecationsOverview: FunctionComponent = () => {
  const {
    kibanaVersionInfo,
    breadcrumbs,
    docLinks,
    api,
    isCloudEnabled,
    cloudDeploymentUrl,
  } = useAppContext();
  const { currentMajor } = kibanaVersionInfo;

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
    <div data-test-subj="overviewPageContent">
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
        <EuiText>
          <EuiLink href={docLinks.links.elasticsearch.whatsNew} target="_blank">
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.whatsNewLink"
              defaultMessage="What's new in version {currentMajor}.0?"
              values={{ currentMajor }}
            />
          </EuiLink>
        </EuiText>
      </EuiPageHeader>

      <EuiSpacer size="l" />

      <EuiPageContentBody style={{ maxWidth: 900 }}>
        <>
          <EuiSpacer size="m" />

          <EuiSteps
            steps={[
              getResolveStep({ currentMajor }),
              getObserveStep(),
              getUpgradeStep({ docLinks, isCloudEnabled, cloudDeploymentUrl, currentMajor }),
            ]}
          />
        </>
      </EuiPageContentBody>
    </div>
  );
};
