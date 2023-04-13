/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { DASHBOARD_LOCATORS_IDS } from '../../../../../../../common/constants';

import { useDashboardLocator } from '../../../../hooks';

export const DashboardsButtons: React.FunctionComponent = () => {
  const dashboardLocator = useDashboardLocator();

  const getDashboardHref = (dashboardId: string) => {
    return dashboardLocator?.getRedirectUrl({ dashboardId }) || '';
  };

  return (
    <>
      <EuiFlexGroup gutterSize="s" justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="dashboardApp"
            href={getDashboardHref(DASHBOARD_LOCATORS_IDS.OVERVIEW)}
            data-test-subj="ingestOverviewLinkButton"
          >
            <FormattedMessage
              id="xpack.fleet.agentList.ingestOverviewButton"
              defaultMessage="Ingest Overview Metrics"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="dashboardApp"
            href={getDashboardHref(DASHBOARD_LOCATORS_IDS.AGENT_INFO)}
            data-test-subj="ingestAgentInfoLinkButton"
          >
            <FormattedMessage
              id="xpack.fleet.agentList.ingestOverviewButton"
              defaultMessage="Agent Info Metrics"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
