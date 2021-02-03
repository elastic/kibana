/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FunctionComponent } from 'react';

import {
  EuiFormRow,
  EuiLink,
  EuiNotificationBadge,
  EuiSpacer,
  // @ts-ignore
  EuiStat,
  EuiSteps,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { UpgradeAssistantTabProps } from '../../types';
import { DeprecationLoggingToggle } from './deprecation_logging_toggle';
import { useAppContext } from '../../../app_context';

// Leaving these here even if unused so they are picked up for i18n static analysis
// Keep this until last minor release (when next major is also released).
const WAIT_FOR_RELEASE_STEP = (majorVersion: number, nextMajorVersion: number) => ({
  title: i18n.translate('xpack.upgradeAssistant.overviewTab.steps.waitForReleaseStep.stepTitle', {
    defaultMessage: 'Wait for the Elasticsearch {nextEsVersion} release',
    values: {
      nextEsVersion: `${nextMajorVersion}.0`,
    },
  }),
  children: (
    <>
      <EuiText grow={false}>
        <p>
          <FormattedMessage
            id="xpack.upgradeAssistant.overviewTab.steps.waitForReleaseStep.stepDetail"
            defaultMessage="Once the release is out, upgrade to the latest {currentEsMajorVersion} version, and then
              return here to proceed with your {nextEsMajorVersion} upgrade."
            values={{
              currentEsMajorVersion: `${majorVersion}.x`, // use "0.x" notation to imply the last minor
              nextEsMajorVersion: `${nextMajorVersion}.0`,
            }}
          />
        </p>
      </EuiText>
    </>
  ),
});

// Swap in this step for the one above it on the last minor release.
// @ts-ignore
const START_UPGRADE_STEP = (isCloudEnabled: boolean, esDocBasePath: string) => ({
  title: i18n.translate('xpack.upgradeAssistant.overviewTab.steps.startUpgradeStep.stepTitle', {
    defaultMessage: 'Start your upgrade',
  }),
  children: (
    <Fragment>
      <EuiText grow={false}>
        <p>
          {isCloudEnabled ? (
            <FormattedMessage
              id="xpack.upgradeAssistant.overviewTab.steps.startUpgradeStepCloud.stepDetail.goToCloudDashboardDetail"
              defaultMessage="Go to the Deployments section on the Elastic Cloud dashboard to start your upgrade."
            />
          ) : (
            <FormattedMessage
              id="xpack.upgradeAssistant.overviewTab.steps.startUpgradeStepOnPrem.stepDetail.followInstructionsDetail"
              defaultMessage="Follow {instructionButton} to start your upgrade."
              values={{
                instructionButton: (
                  <EuiLink href={`${esDocBasePath}/setup-upgrade.html`} target="_blank" external>
                    <FormattedMessage
                      id="xpack.upgradeAssistant.overviewTab.steps.startUpgradeStepOnPrem.stepDetail.instructionButtonLabel"
                      defaultMessage="these instructions"
                    />
                  </EuiLink>
                ),
              }}
            />
          )}
        </p>
      </EuiText>
    </Fragment>
  ),
});

export const Steps: FunctionComponent<UpgradeAssistantTabProps> = ({
  checkupData,
  setSelectedTabIndex,
}) => {
  const checkupDataTyped = (checkupData! as unknown) as { [checkupType: string]: any[] };
  const countByType = Object.keys(checkupDataTyped).reduce((counts, checkupType) => {
    counts[checkupType] = checkupDataTyped[checkupType].length;
    return counts;
  }, {} as { [checkupType: string]: number });

  // Uncomment when START_UPGRADE_STEP is in use!
  const { kibanaVersionInfo, docLinks, http /* , isCloudEnabled */ } = useAppContext();

  const { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL } = docLinks;
  const esDocBasePath = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}`;

  const { currentMajor, nextMajor } = kibanaVersionInfo;

  return (
    <EuiSteps
      className="upgSteps"
      headingElement="h2"
      steps={[
        {
          title: countByType.cluster
            ? i18n.translate(
                'xpack.upgradeAssistant.overviewTab.steps.clusterStep.issuesRemainingStepTitle',
                {
                  defaultMessage: 'Check for issues with your cluster',
                }
              )
            : i18n.translate(
                'xpack.upgradeAssistant.overviewTab.steps.clusterStep.noIssuesRemainingStepTitle',
                {
                  defaultMessage: 'Your cluster settings are ready',
                }
              ),
          status: countByType.cluster ? 'warning' : 'complete',
          children: (
            <EuiText>
              {countByType.cluster ? (
                <Fragment>
                  <p>
                    <FormattedMessage
                      id="xpack.upgradeAssistant.overviewTab.steps.clusterStep.todo.todoDetail"
                      defaultMessage="Go to the {clusterTabButton} to update the deprecated settings."
                      values={{
                        clusterTabButton: (
                          <EuiLink onClick={() => setSelectedTabIndex(1)}>
                            <FormattedMessage
                              id="xpack.upgradeAssistant.overviewTab.steps.clusterStep.todo.clusterTabButtonLabel"
                              defaultMessage="Cluster tab"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </p>
                  <p>
                    <FormattedMessage
                      id="xpack.upgradeAssistant.overviewTab.steps.clusterStep.remainingIssuesDetail"
                      defaultMessage="{numIssues} issues must be resolved."
                      values={{
                        numIssues: (
                          <EuiNotificationBadge>{countByType.cluster}</EuiNotificationBadge>
                        ),
                      }}
                    />
                  </p>
                </Fragment>
              ) : (
                <p>
                  <FormattedMessage
                    id="xpack.upgradeAssistant.overviewTab.steps.clusterStep.noRemainingIssuesLabel"
                    defaultMessage="No remaining deprecated settings."
                  />
                </p>
              )}
            </EuiText>
          ),
        },
        {
          title: countByType.indices
            ? i18n.translate(
                'xpack.upgradeAssistant.overviewTab.steps.indicesStep.issuesRemainingStepTitle',
                {
                  defaultMessage: 'Check for issues with your indices',
                }
              )
            : i18n.translate(
                'xpack.upgradeAssistant.overviewTab.steps.indicesStep.noIssuesRemainingStepTitle',
                {
                  defaultMessage: 'Your index settings are ready',
                }
              ),
          status: countByType.indices ? 'warning' : 'complete',
          children: (
            <EuiText>
              {countByType.indices ? (
                <Fragment>
                  <p>
                    <FormattedMessage
                      id="xpack.upgradeAssistant.overviewTab.steps.indicesStep.todo.todoDetail"
                      defaultMessage="Go to the {indicesTabButton} to update the deprecated settings."
                      values={{
                        indicesTabButton: (
                          <EuiLink onClick={() => setSelectedTabIndex(2)}>
                            <FormattedMessage
                              id="xpack.upgradeAssistant.overviewTab.steps.indicesStep.todo.indicesTabButtonLabel"
                              defaultMessage="Indices tab"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </p>
                  <p>
                    <FormattedMessage
                      id="xpack.upgradeAssistant.overviewTab.steps.indicesStep.remainingIssuesDetail"
                      defaultMessage="{numIssues} issues must be resolved."
                      values={{
                        numIssues: (
                          <EuiNotificationBadge>{countByType.indices}</EuiNotificationBadge>
                        ),
                      }}
                    />
                  </p>
                </Fragment>
              ) : (
                <p>
                  <FormattedMessage
                    id="xpack.upgradeAssistant.overviewTab.steps.indicesStep.noRemainingIssuesLabel"
                    defaultMessage="No remaining deprecated settings."
                  />
                </p>
              )}
            </EuiText>
          ),
        },
        {
          title: i18n.translate(
            'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.stepTitle',
            {
              defaultMessage: 'Review the Elasticsearch deprecation logs',
            }
          ),
          children: (
            <Fragment>
              <EuiText grow={false}>
                <p>
                  <FormattedMessage
                    id="xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.deprecationLogs.logsDetail"
                    defaultMessage="Read the {deprecationLogsDocButton} to see if your applications
                      are using functionality that is not available in {nextEsVersion}. You may need to enable deprecation logging."
                    values={{
                      deprecationLogsDocButton: (
                        <EuiLink
                          href={`${esDocBasePath}/logging.html#deprecation-logging`}
                          target="_blank"
                          external
                        >
                          <FormattedMessage
                            id="xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.deprecationLogs.deprecationLogsDocButtonLabel"
                            defaultMessage="deprecation logs"
                          />
                        </EuiLink>
                      ),
                      nextEsVersion: `${nextMajor}.0`,
                    }}
                  />
                </p>
              </EuiText>

              <EuiSpacer />

              <EuiFormRow
                label={i18n.translate(
                  'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingLabel',
                  {
                    defaultMessage: 'Enable deprecation logging?',
                  }
                )}
                describedByIds={['deprecation-logging']}
              >
                <DeprecationLoggingToggle http={http} />
              </EuiFormRow>
            </Fragment>
          ),
        },

        // Swap in START_UPGRADE_STEP on the last minor release.
        WAIT_FOR_RELEASE_STEP(currentMajor, nextMajor),
        // START_UPGRADE_STEP(isCloudEnabled, esDocBasePath),
      ]}
    />
  );
};
