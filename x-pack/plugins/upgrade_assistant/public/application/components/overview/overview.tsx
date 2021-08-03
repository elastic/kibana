/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';

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

const i18nTexts = {
  pageTitle: i18n.translate('xpack.upgradeAssistant.overview.pageTitle', {
    defaultMessage: 'Upgrade Assistant',
  }),
  docLink: i18n.translate('xpack.upgradeAssistant.overview.documentationLinkText', {
    defaultMessage: 'Documentation',
  }),
};

const PageDescription = ({
  version,
  upgradeGuideLink,
  whatsNewLink,
}: {
  version: number;
  upgradeGuideLink: string;
  whatsNewLink: string;
}) => (
  <>
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.pageDescription"
      defaultMessage="Get ready for the next version of Elastic Stack. Prepare to upgrade by identifying deprecated settings and features below. When you are ready, follow the {upgradeGuideLink} to complete your version upgrade."
      values={{
        upgradeGuideLink: (
          <EuiLink href={upgradeGuideLink} target="_blank" external={false}>
            {i18n.translate('xpack.upgradeAssistant.overview.pageDescriptionLink', {
              defaultMessage: 'upgrade guide',
            })}
          </EuiLink>
        ),
      }}
    />

    <EuiSpacer size="m" />

    <EuiText>
      <EuiLink href={whatsNewLink} target="_blank">
        <FormattedMessage
          id="xpack.upgradeAssistant.overview.pageDescriptionLink"
          defaultMessage="Learn about what is new in version {version}.0"
          values={{ version }}
        />
      </EuiLink>
    </EuiText>
  </>
);

interface Props {
  history: RouteComponentProps['history'];
}

export const DeprecationsOverview: FunctionComponent<Props> = ({ history }) => {
  const { kibanaVersionInfo, breadcrumbs, docLinks, api, isCloudEnabled } = useAppContext();
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
        pageTitle={i18nTexts.pageTitle}
        description={
          <PageDescription
            version={currentMajor}
            upgradeGuideLink={docLinks.links.elasticsearch.setupUpgrade}
            whatsNewLink={docLinks.links.elasticsearch.migrating8}
          />
        }
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

      <EuiSpacer size="l" />

      <EuiPageContentBody style={{ maxWidth: 900 }}>
        <>
          <EuiSpacer size="m" />

          <EuiSteps
            steps={[
              getResolveStep({ history }),
              getObserveStep({ docLinks }),
              getUpgradeStep({ docLinks, isCloudEnabled }),
            ]}
          />
        </>
      </EuiPageContentBody>
    </div>
  );
};
