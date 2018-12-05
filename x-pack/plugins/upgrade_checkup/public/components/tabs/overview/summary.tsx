/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  // @ts-ignore
  EuiSpacer,
  // @ts-ignore
  EuiStat,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

import { LoadingState, UpgradeCheckupTabProps } from '../../types';

type SummaryProps = UpgradeCheckupTabProps & ReactIntl.InjectedIntlProps;

export const SummaryUI: React.StatelessComponent<SummaryProps> = ({
  loadingState,
  checkupData,
  setSelectedTabIndex,
  intl,
}) => {
  if (loadingState !== LoadingState.Success) {
    return (
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const totalCount = Object.values(checkupData!).reduce((sum, v) => sum + v.length, 0);

  if (totalCount > 0) {
    const countByType = Object.keys(checkupData!).reduce(
      (counts, checkupType) => {
        counts[checkupType] = checkupData![checkupType].length;
        return counts;
      },
      {} as { [checkupType: string]: number }
    );

    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem style={{ maxWidth: 220 }}>
          <EuiPanel>
            <EuiStat
              title={countByType.cluster}
              description={intl.formatMessage(
                {
                  id: 'xpack.upgradeCheckup.overview.summary.clusterIssuesLabel',
                  defaultMessage: 'Cluster {issueCount, plural, one {issue} other {issues}}',
                },
                { issueCount: countByType.cluster }
              )}
            >
              <EuiLink onClick={() => setSelectedTabIndex(1)}>
                <FormattedMessage
                  id="xpack.upgradeCheckup.overview.summary.viewAllButtonLabel"
                  defaultMessage="View all"
                />
              </EuiLink>
            </EuiStat>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem style={{ maxWidth: 220 }}>
          <EuiPanel>
            <EuiStat
              title={countByType.indices}
              description={intl.formatMessage(
                {
                  id: 'xpack.upgradeCheckup.overview.summary.indexIssuesLabel',
                  defaultMessage: 'Index {issueCount, plural, one {issue} other {issues}}',
                },
                { issueCount: countByType.indices }
              )}
            >
              <EuiLink onClick={() => setSelectedTabIndex(2)}>
                <FormattedMessage
                  id="xpack.upgradeCheckup.overview.summary.viewAllButtonLabel"
                  defaultMessage="View all"
                />
              </EuiLink>
            </EuiStat>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else {
    return (
      <EuiPanel>
        <EuiText grow={false}>
          <h2>The coast is clear!</h2>
          <p>
            There are no issues with either your cluster or your indices. You may proceed with the
            upgrade.
          </p>
          <p>
            If you're on cloud, <EuiLink>go here</EuiLink>, otherwise <EuiLink>go here</EuiLink>.
          </p>
        </EuiText>
      </EuiPanel>
    );
  }
};

export const Summary = injectI18n(SummaryUI);
