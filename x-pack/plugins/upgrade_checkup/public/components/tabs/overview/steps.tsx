/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, StatelessComponent } from 'react';

import {
  // @ts-ignore
  EuiDescribedFormGroup,
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

import { UpgradeCheckupTabProps } from '../../types';
import { DeprecationLoggingToggle } from './deprecation_logging_toggle';

// Eui's types don't have this prop
const EuiFormRowPrime: React.StatelessComponent<
  EuiFormRowProps & { describedByIds?: string[] }
> = EuiFormRow;

export const Steps: StatelessComponent<UpgradeCheckupTabProps> = ({
  checkupData,
  setSelectedTabIndex,
}) => {
  const countByType = Object.keys(checkupData!).reduce(
    (counts, checkupType) => {
      counts[checkupType] = checkupData![checkupType].length;
      return counts;
    },
    {} as { [checkupType: string]: number }
  );

  return (
    <EuiSteps
      headingElement="h2"
      steps={[
        {
          title: 'Check for issues with your cluster',
          status: countByType.cluster ? 'warning' : 'complete',
          children: (
            <EuiText>
              {countByType.cluster ? (
                <Fragment>
                  <p>
                    Fix deprecated cluster-wide settings by visiting the{' '}
                    <EuiLink onClick={() => setSelectedTabIndex(1)}>cluster tab.</EuiLink>
                  </p>
                  <p>
                    There are <EuiNotificationBadge>{countByType.cluster}</EuiNotificationBadge>{' '}
                    issues left to resolve.
                  </p>
                </Fragment>
              ) : (
                <p>There are no deprecations remaining to resolve with your cluster settings.</p>
              )}
            </EuiText>
          ),
        },
        {
          title: 'Check for issues with your indices',
          status: countByType.indices ? 'warning' : 'complete',
          children: (
            <EuiText>
              {countByType.indices ? (
                <Fragment>
                  <p>
                    Fix deprecated index settings and reindex old indices by visiting the{' '}
                    <EuiLink onClick={() => setSelectedTabIndex(2)}>indices tab.</EuiLink>
                  </p>
                  <p>
                    There are <EuiNotificationBadge>{countByType.indices}</EuiNotificationBadge>{' '}
                    issues left to resolve.
                  </p>
                </Fragment>
              ) : (
                <p>There are no deprecations remaining to resolve with your index settings.</p>
              )}
            </EuiText>
          ),
        },
        {
          title: 'Review Elasticsearch deprecation logs',
          children: (
            <Fragment>
              <EuiText>
                <p>
                  Find and read through Elasticsearch's{' '}
                  <EuiLink
                    href="https://www.elastic.co/guide/en/elasticsearch/reference/current/logging.html#deprecation-logging"
                    target="_blank"
                  >
                    deprecation logs
                  </EuiLink>{' '}
                  to ensure that your applications are not using deprecated features that will be
                  removed in 7.0.
                </p>
              </EuiText>

              <EuiSpacer />

              <EuiDescribedFormGroup
                idAria="deprecation-logging"
                title={<h3>Deprecation logging</h3>}
                titleSize="xxs"
                fullWidth
                description={
                  <Fragment>
                    Elasticsearch comes with a deprecation logger which will log a message whenever
                    deprecated functionality is used. Enable or disable deprecation logging on your
                    cluster here. This is enabled by default, beginning in Elasticsearch 5.0.
                  </Fragment>
                }
              >
                <EuiFormRowPrime
                  label="Enable deprecation logging?"
                  describedByIds={['deprecation-logging']}
                >
                  <DeprecationLoggingToggle />
                </EuiFormRowPrime>
              </EuiDescribedFormGroup>
            </Fragment>
          ),
        },
      ]}
    />
  );
};
