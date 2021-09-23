/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';

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
import { getBackupStep } from './backup_step';
import { getFixIssuesStep } from './fix_issues_step';
import { getFixLogsStep } from './fix_logs_step';
import { getUpgradeStep } from './upgrade_step';

type OverviewStep = 'backup' | 'fix_issues' | 'fix_logs';

export const Overview: FunctionComponent = () => {
  const {
    kibanaVersionInfo: { nextMajor },
    services: {
      breadcrumbs,
      api,
      core: { docLinks },
    },
    plugins: { cloud },
  } = useAppContext();

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

  const [completedStepsMap, setCompletedStepsMap] = useState({
    backup: false,
    fix_issues: false,
    fix_logs: false,
  });

  const isStepComplete = (step: OverviewStep) => completedStepsMap[step];
  const setCompletedStep = (step: OverviewStep, isCompleted: boolean) => {
    setCompletedStepsMap({
      ...completedStepsMap,
      [step]: isCompleted,
    });
  };

  return (
    <EuiPageBody restrictWidth={true} data-test-subj="overview">
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
              href={docLinks.links.upgradeAssistant.overview}
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
            getBackupStep({
              cloud,
              isComplete: isStepComplete('backup'),
              setIsComplete: setCompletedStep.bind(null, 'backup'),
            }),
            getFixIssuesStep({
              nextMajor,
              isComplete: isStepComplete('fix_issues'),
              setIsComplete: setCompletedStep.bind(null, 'fix_issues'),
            }),
            getFixLogsStep({
              isComplete: isStepComplete('fix_logs'),
              setIsComplete: setCompletedStep.bind(null, 'fix_logs'),
            }),
            getUpgradeStep({ docLinks, nextMajor }),
          ]}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
