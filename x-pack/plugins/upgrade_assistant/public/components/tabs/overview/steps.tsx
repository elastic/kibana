/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, StatelessComponent } from 'react';

import {
  EuiFormRow,
  EuiFormRowProps,
  EuiLink,
  EuiNotificationBadge,
  EuiSpacer,
  // @ts-ignore
  EuiStat,
  EuiSteps,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

import { NEXT_MAJOR_VERSION } from '../../../../common/version';
import { UpgradeAssistantTabProps } from '../../types';
import { DeprecationLoggingToggle } from './deprecation_logging_toggle';

// Eui's types don't have this prop
const EuiFormRowPrime: React.StatelessComponent<
  EuiFormRowProps & { describedByIds?: string[] }
> = EuiFormRow;

export const StepsUI: StatelessComponent<
  UpgradeAssistantTabProps & ReactIntl.InjectedIntlProps
> = ({ checkupData, setSelectedTabIndex, intl }) => {
  const countByType = Object.keys(checkupData!).reduce(
    (counts, checkupType) => {
      counts[checkupType] = checkupData![checkupType].length;
      return counts;
    },
    {} as { [checkupType: string]: number }
  );

  return (
    <EuiSteps
      className="upgSteps"
      headingElement="h2"
      steps={[
        {
          title: intl.formatMessage({
            id: 'xpack.upgradeAssistant.overviewTab.steps.clusterStep.stepTitle',
            defaultMessage: 'Check for issues with your cluster',
          }),
          status: countByType.cluster ? 'warning' : 'complete',
          children: (
            <EuiText>
              {countByType.cluster ? (
                <Fragment>
                  <p>
                    <FormattedMessage
                      id="xpack.upgradeAssistant.overviewTab.steps.clusterStep.todo.todoDetail"
                      defaultMessage="Go to the {clusterTabButton} to update deprecated cluster settings."
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
                    defaultMessage="There are no remaining deprecated cluster settings."
                  />
                </p>
              )}
            </EuiText>
          ),
        },
        {
          title: intl.formatMessage({
            id: 'xpack.upgradeAssistant.overviewTab.steps.indicesStep.stepTitle',
            defaultMessage: 'Check for issues with your indices',
          }),
          status: countByType.indices ? 'warning' : 'complete',
          children: (
            <EuiText>
              {countByType.indices ? (
                <Fragment>
                  <p>
                    <FormattedMessage
                      id="xpack.upgradeAssistant.overviewTab.steps.indicesStep.todo.todoDetail"
                      defaultMessage="Go to the {indicesTabButton} to update deprecated index settings."
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
                    defaultMessage="There are no remaining deprecated index settings."
                  />
                </p>
              )}
            </EuiText>
          ),
        },
        {
          title: intl.formatMessage({
            id: 'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.stepTitle',
            defaultMessage: 'Review the Elasticsearch deprecation logs',
          }),
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
                          href="https://www.elastic.co/guide/en/elasticsearch/reference/current/logging.html#deprecation-logging"
                          target="_blank"
                        >
                          <FormattedMessage
                            id="xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.deprecationLogs.deprecationLogsDocButtonLabel"
                            defaultMessage="deprecation logs"
                          />
                        </EuiLink>
                      ),
                      nextEsVersion: `${NEXT_MAJOR_VERSION}.0`,
                    }}
                  />
                </p>
              </EuiText>

              <EuiSpacer />

              <EuiFormRowPrime
                label={intl.formatMessage({
                  id:
                    'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingLabel',
                  defaultMessage: 'Enable deprecation logging?',
                })}
                describedByIds={['deprecation-logging']}
              >
                <DeprecationLoggingToggle />
              </EuiFormRowPrime>
            </Fragment>
          ),
        },
      ]}
    />
  );
};

export const Steps = injectI18n(StepsUI);
