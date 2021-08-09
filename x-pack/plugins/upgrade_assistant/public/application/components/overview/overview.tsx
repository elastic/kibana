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

const PageDescription = ({ version, whatsNewLink }: { version: number; whatsNewLink: string }) => (
  <>
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.pageDescription"
      defaultMessage="Get ready for the next version of Elastic Stack!"
    />

    <EuiSpacer size="m" />

    <EuiText>
      <EuiLink href={whatsNewLink} target="_blank">
        <FormattedMessage
          id="xpack.upgradeAssistant.overview.pageDescriptionLink"
          defaultMessage="What's new in version {version}.0?"
          values={{ version }}
        />
      </EuiLink>
    </EuiText>
  </>
);

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
        description={
          <PageDescription
            version={currentMajor}
            whatsNewLink={docLinks.links.elasticsearch.whatsNew}
          />
        }
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
      />

      <EuiSpacer size="l" />

      <EuiPageContentBody style={{ maxWidth: 900 }}>
        <>
          <EuiSpacer size="m" />

          <EuiSteps
            steps={[
              getResolveStep({ currentMajor }),
              getObserveStep({ docLinks, currentMajor }),
              getUpgradeStep({ docLinks, isCloudEnabled, cloudDeploymentUrl, currentMajor }),
            ]}
          />
        </>
      </EuiPageContentBody>
    </div>
  );
};
