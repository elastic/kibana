/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiSteps,
  EuiText,
  EuiPageHeader,
  EuiButtonEmpty,
  EuiSpacer,
  EuiLink,
  EuiPageBody,
  EuiPageContentBody,
} from '@elastic/eui';
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
      <EuiPageContentBody color="transparent" paddingSize="none">
        <EuiPageHeader
          bottomBorder
          pageTitle={i18n.translate('xpack.upgradeAssistant.overview.pageTitle', {
            defaultMessage: 'Upgrade Assistant',
          })}
          description={i18n.translate('xpack.upgradeAssistant.overview.pageDescription', {
            defaultMessage: 'Get ready for the next version of Elastic!',
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
            <EuiLink href={docLinks.links.elasticsearch.version8ReleaseHighlights} target="_blank">
              <FormattedMessage
                id="xpack.upgradeAssistant.overview.whatsNewLink"
                defaultMessage="What's new in 8.x?"
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
          ]}
        />
      </EuiPageContentBody>
    </EuiPageBody>
  );
});
