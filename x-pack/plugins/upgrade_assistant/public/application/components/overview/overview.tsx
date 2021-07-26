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
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiButton,
  EuiIcon,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import type { DocLinksStart } from 'src/core/public';

import { RouteComponentProps } from 'react-router-dom';
import { useAppContext } from '../../app_context';
import { LatestMinorBanner } from '../latest_minor_banner';
import { ESDeprecationStats } from './es_stats';
import { KibanaDeprecationStats } from './kibana_stats';
import { DeprecationLoggingToggle } from './deprecation_logging_toggle';
import { LogStream } from '../../../../../infra/public';
import { Collapsible } from './collapsible';

const i18nTexts = {
  pageTitle: i18n.translate('xpack.upgradeAssistant.overview.pageTitle', {
    defaultMessage: 'Upgrade Assistant',
  }),
  // TODO: probably should become its own component?
  pageDescription: ({
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
            <EuiLink href={upgradeGuideLink} target="_blank">
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
  ),
  docLink: i18n.translate('xpack.upgradeAssistant.overview.documentationLinkText', {
    defaultMessage: 'Documentation',
  }),
  resolveStepTitle: i18n.translate('xpack.upgradeAssistant.overview.resolveStepTitle', {
    defaultMessage: 'Resolve deprecation issues in Elasticsearch and Kibana',
  }),
  resolveStepDescription: () => (
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.resolveStepDescription"
      defaultMessage="Review your deprecation issues. Use the provided {quickResolve} actions to update configuration automatically. Follow instructions for any issues in need of manual configuration."
      values={{ quickResolve: <b>Quick Resolve</b> }}
    />
  ),
  observeStepTitle: i18n.translate('xpack.upgradeAssistant.overview.observeStepTitle', {
    defaultMessage: 'Observe deprecation logs',
  }),
  observeStepDescription: (href: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.observeStepDescription"
      defaultMessage="Collect and review the deprecation logs to see if your applications are using functionality that is not available in the next version. {deprecationLoggingLink} and how to manage them."
      values={{
        deprecationLoggingLink: (
          <EuiLink href={href} target="_blank">
            {i18n.translate(
              'xpack.upgradeAssistant.deprecationLoggingDescription.observeStepDescriptionLink',
              {
                defaultMessage: 'Learn more about deprecation logs',
              }
            )}
          </EuiLink>
        ),
      }}
    />
  ),
  upgradeStepTitle: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepTitle', {
    defaultMessage: 'Upgrade the Stack',
  }),
  upgradeStepDescription: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepDescription', {
    defaultMessage:
      'After you have resolved your deprecations issues and are satisfied with the deprecation logs, it is time to upgrade. Follow the instructions in our documentation to complete your update.',
  }),
  upgradeStepLink: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepLink', {
    defaultMessage: 'Follow the upgrade guide',
  }),
};

interface Props {
  history: RouteComponentProps['history'];
}

const getResolveStep = ({ history }: Props): EuiStepProps => {
  return {
    title: i18nTexts.resolveStepTitle,
    status: 'incomplete',
    children: (
      <>
        <EuiText>
          <p>{i18nTexts.resolveStepDescription()}</p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFlexGroup>
          <EuiFlexItem>
            <ESDeprecationStats history={history} />
          </EuiFlexItem>

          <EuiFlexItem>
            <KibanaDeprecationStats history={history} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    ),
  };
};

const getObserveStep = ({ docLinks }: { docLinks: DocLinksStart }): EuiStepProps => {
  const endTimestamp = Date.now();
  const startTimestamp = endTimestamp - 120 * 60 * 1000; // 2 hours

  const viewLogs = (
    <div>
      <EuiButtonEmpty size="xs" href="/observe">
        <FormattedMessage
          id="xpack.upgradeAssistant.overview.viewObserveResultsAction"
          defaultMessage="View deprecation logs in Observability"
        />
      </EuiButtonEmpty>
      <EuiButtonEmpty size="xs" href="/discover">
        <FormattedMessage
          id="xpack.upgradeAssistant.overview.viewDiscoverResultsAction"
          defaultMessage="Analyse logs in Discover "
        />
      </EuiButtonEmpty>
    </div>
  );

  return {
    title: i18nTexts.observeStepTitle,
    status: 'incomplete',
    children: (
      <>
        <EuiText>
          <p>{i18nTexts.observeStepDescription(docLinks.links.elasticsearch.deprecationLogging)}</p>
        </EuiText>

        <EuiSpacer size="m" />

        <DeprecationLoggingToggle />

        <EuiSpacer size="l" />

        <Collapsible renderFooterLinks={viewLogs}>
          <LogStream
            sourceId="deprecation_logs"
            startTimestamp={startTimestamp}
            endTimestamp={endTimestamp}
            columns={[
              { type: 'timestamp', header: false },
              { type: 'message', header: false },
            ]}
          />
        </Collapsible>
      </>
    ),
  };
};

const getUpgradeStep = (): EuiStepProps => {
  return {
    title: i18nTexts.upgradeStepTitle,
    status: 'incomplete',
    children: (
      <>
        <EuiText>
          <p>{i18nTexts.upgradeStepDescription}</p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiButton href="/#/navigation/button">
          {i18nTexts.upgradeStepLink}
          <EuiIcon type="popout" size="s" style={{ marginLeft: 4 }} />
        </EuiButton>
      </>
    ),
  };
};

export const DeprecationsOverview: FunctionComponent<Props> = ({ history }) => {
  const { kibanaVersionInfo, breadcrumbs, docLinks, api } = useAppContext();
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
        description={i18nTexts.pageDescription({
          version: currentMajor,
          upgradeGuideLink: '',
          whatsNewLink: '',
        })}
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

      <EuiPageContentBody>
        <>
          {/* Remove this in last minor of the current major (e.g., 7.15) */}
          <LatestMinorBanner />

          <EuiSpacer size="xl" />

          <EuiSteps
            steps={[getResolveStep({ history }), getObserveStep({ docLinks }), getUpgradeStep()]}
          />
        </>
      </EuiPageContentBody>
    </div>
  );
};
