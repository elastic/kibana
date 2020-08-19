/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexItem,
  EuiI18nNumber,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { OverviewPanel } from './overview_panel';
import { OverviewStats } from './overview_stats';
import { useLink, useGetPackagePolicies } from '../../../hooks';
import { AgentPolicy } from '../../../types';
import { Loading } from '../../fleet/components';

export const OverviewPolicySection: React.FC<{ agentPolicies: AgentPolicy[] }> = ({
  agentPolicies,
}) => {
  const { getHref } = useLink();
  const packagePoliciesRequest = useGetPackagePolicies({
    page: 1,
    perPage: 10000,
  });

  return (
    <EuiFlexItem component="section">
      <OverviewPanel
        title={i18n.translate('xpack.ingestManager.overviewPagePoliciesPanelTitle', {
          defaultMessage: 'Agent policies',
        })}
        tooltip={i18n.translate('xpack.ingestManager.overviewPagePoliciesPanelTooltip', {
          defaultMessage: 'Use agent policies to control the data that your agents collect.',
        })}
        linkTo={getHref('policies_list')}
        linkToText={i18n.translate('xpack.ingestManager.overviewPagePoliciesPanelAction', {
          defaultMessage: 'View policies',
        })}
      >
        <OverviewStats>
          {packagePoliciesRequest.isLoading ? (
            <Loading />
          ) : (
            <>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ingestManager.overviewPolicyTotalTitle"
                  defaultMessage="Total available"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={agentPolicies.length} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ingestManager.overviewPackagePolicyTitle"
                  defaultMessage="Used integrations"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={packagePoliciesRequest.data?.total ?? 0} />
              </EuiDescriptionListDescription>
            </>
          )}
        </OverviewStats>
      </OverviewPanel>
    </EuiFlexItem>
  );
};
