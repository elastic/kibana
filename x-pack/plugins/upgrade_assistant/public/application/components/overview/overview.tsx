/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiSteps,
  EuiPageHeader,
  EuiButtonEmpty,
  EuiSpacer,
  EuiLink,
  EuiPageBody,
  EuiPageSection,
  EuiText,
} from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { FormattedMessage } from '@kbn/i18n-react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import { useAppContext } from '../../app_context';
import { uiMetricService, UIM_OVERVIEW_PAGE_LOAD } from '../../lib/ui_metric';
import { getBackupStep } from './backup_step';
import { getFixIssuesStep } from './fix_issues_step';
import { getUpgradeStep } from './upgrade_step';
import { getMigrateSystemIndicesStep } from './migrate_system_indices';
import { getLogsStep } from './logs_step';

type OverviewStep = 'backup' | 'migrate_system_indices' | 'fix_issues' | 'logs';

export const Overview = withRouter(({ history }: RouteComponentProps) => {
  const {
    featureSet: { migrateSystemIndices },
    kibanaVersionInfo: { currentVersion },
    services: {
      breadcrumbs,
      core: { docLinks },
    },
    plugins: { cloud },
  } = useAppContext();

  useEffect(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.LOADED, UIM_OVERVIEW_PAGE_LOAD);
  }, []);

  useEffect(() => {
    breadcrumbs.setBreadcrumbs('overview');
  }, [breadcrumbs]);

  const [completedStepsMap, setCompletedStepsMap] = useState({
    backup: false,
    migrate_system_indices: false,
    fix_issues: false,
    logs: false,
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
      <EuiPageSection color="transparent" paddingSize="none">
        <EuiPageHeader
          bottomBorder
          pageTitle={i18n.translate('xpack.upgradeAssistant.overview.pageTitle', {
            defaultMessage: 'Upgrade Assistant',
          })}
          description={i18n.translate('xpack.upgradeAssistant.overview.pageDescription', {
            defaultMessage:
              'This is version {currentVersion} of the Elastic Stack, get ready for the next version!',
            values: { currentVersion },
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
          <EuiText>
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.upgradeToLatestMinorBeforeMajorMessage"
              defaultMessage="Check the {link}. Before upgrading to a new major version, you must first upgrade to the latest minor of this major version."
              values={{
                link: (
                  <EuiLink
                    data-test-subj="whatsNewLink"
                    href={docLinks.links.elasticsearch.latestReleaseHighlights}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.upgradeAssistant.overview.minorOfLatestMajorReleaseNotes"
                      defaultMessage="latest release highlights"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </EuiPageHeader>
        <EuiSpacer size="l" />
        <EuiSteps
          steps={
            [
              getBackupStep({
                cloud,
                isComplete: isStepComplete('backup'),
                setIsComplete: setCompletedStep.bind(null, 'backup'),
              }),
              migrateSystemIndices &&
                getMigrateSystemIndicesStep({
                  docLinks,
                  isComplete: isStepComplete('migrate_system_indices'),
                  setIsComplete: setCompletedStep.bind(null, 'migrate_system_indices'),
                }),
              getFixIssuesStep({
                isComplete: isStepComplete('fix_issues'),
                setIsComplete: setCompletedStep.bind(null, 'fix_issues'),
              }),
              getLogsStep({
                isComplete: isStepComplete('logs'),
                setIsComplete: setCompletedStep.bind(null, 'logs'),
                navigateToEsDeprecationLogs: () => history.push('/es_deprecation_logs'),
              }),
              getUpgradeStep(),
            ].filter(Boolean) as EuiStepProps[]
          }
        />
      </EuiPageSection>
    </EuiPageBody>
  );
});
