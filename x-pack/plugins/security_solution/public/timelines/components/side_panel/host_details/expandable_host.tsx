/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { EuiTitle } from '@elastic/eui';
import { HostDetailsLink } from '../../../../common/components/links';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useSourcererScope } from '../../../../common/containers/sourcerer';
import { HostOverview } from '../../../../overview/components/host_overview';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { HostItem } from '../../../../../common/search_strategy';
import { AnomalyTableProvider } from '../../../../common/components/ml/anomaly/anomaly_table_provider';
import { hostToCriteria } from '../../../../common/components/ml/criteria/host_to_criteria';
import { scoreIntervalToDateTime } from '../../../../common/components/ml/score/score_interval_to_datetime';
import { HostOverviewByNameQuery } from '../../../../hosts/containers/hosts/details';

interface ExpandableHostProps {
  hostName: string;
}

const StyledTitle = styled.h4`
  word-break: break-all;
  word-wrap: break-word;
  white-space: pre-wrap;
`;

export const ExpandableHostDetailsTitle = ({ hostName }: ExpandableHostProps) => (
  <EuiTitle size="s">
    <StyledTitle>
      {i18n.translate('xpack.securitySolution.timeline.sidePanel.hostDetails.title', {
        defaultMessage: 'Host details',
      })}
      {`: ${hostName}`}
    </StyledTitle>
  </EuiTitle>
);

export const ExpandableHostDetailsPageLink = ({ hostName }: ExpandableHostProps) => (
  <HostDetailsLink hostName={hostName} isButton>
    {i18n.translate('xpack.securitySolution.timeline.sidePanel.hostDetails.hostDetailsPageLink', {
      defaultMessage: 'View details page',
    })}
  </HostDetailsLink>
);

export const ExpandableHostDetails = ({
  contextID,
  hostName,
}: ExpandableHostProps & { contextID: string }) => {
  const { to, from, isInitializing } = useGlobalTime();
  const { docValueFields, selectedPatterns } = useSourcererScope();
  return (
    <HostOverviewByNameQuery
      indexNames={selectedPatterns}
      sourceId="default"
      hostName={hostName}
      skip={isInitializing}
      startDate={from}
      endDate={to}
    >
      {({ hostOverview, loading, id }) => (
        <AnomalyTableProvider
          criteriaFields={hostToCriteria(hostOverview)}
          startDate={from}
          endDate={to}
          skip={isInitializing}
        >
          {({ isLoadingAnomaliesData, anomaliesData }) => (
            <HostOverview
              contextID={contextID}
              docValueFields={docValueFields}
              id={id}
              isInDetailsSidePanel
              data={hostOverview as HostItem}
              anomaliesData={anomaliesData}
              isLoadingAnomaliesData={isLoadingAnomaliesData}
              indexNames={selectedPatterns}
              loading={loading}
              startDate={from}
              endDate={to}
              narrowDateRange={(score, interval) => {
                const fromTo = scoreIntervalToDateTime(score, interval);
                setAbsoluteRangeDatePicker({
                  id: 'global',
                  from: fromTo.from,
                  to: fromTo.to,
                });
              }}
            />
          )}
        </AnomalyTableProvider>
      )}
    </HostOverviewByNameQuery>
  );
};
