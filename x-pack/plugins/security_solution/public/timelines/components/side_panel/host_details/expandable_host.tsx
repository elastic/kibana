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
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { HostOverview } from '../../../../overview/components/host_overview';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { HostItem } from '../../../../../common/search_strategy';
import { AnomalyTableProvider } from '../../../../common/components/ml/anomaly/anomaly_table_provider';
import { hostToCriteria } from '../../../../common/components/ml/criteria/host_to_criteria';
import { scoreIntervalToDateTime } from '../../../../common/components/ml/score/score_interval_to_datetime';
import { useHostDetails, ID } from '../../../../hosts/containers/hosts/details';

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
  isDraggable = false,
}: ExpandableHostProps & { contextID: string; isDraggable?: boolean }) => {
  const { to, from, isInitializing } = useGlobalTime();
  /*
    Normally `selectedPatterns` from useSourcererDataView would be where we obtain the indices,
    but those indices are only loaded when viewing the pages where the sourcerer is initialized (i.e. Hosts and Overview)
    When a user goes directly to the detections page, the patterns have not been loaded yet
    as that information isn't used for the detections page. With this details component being accessible
    from the detections page, the decision was made to get all existing index names to account for this.
    Otherwise, an empty array is defaulted for the `indexNames` in the query which leads to inconsistencies in the data returned
    (i.e. extraneous endpoint data is retrieved from the backend leading to endpoint data not being returned)
  */
  const { docValueFields, selectedPatterns } = useSourcererDataView();

  const [loading, { hostDetails: hostOverview }] = useHostDetails({
    endDate: to,
    hostName,
    indexNames: selectedPatterns,
    startDate: from,
  });
  return (
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
          id={ID}
          isInDetailsSidePanel
          data={hostOverview as HostItem}
          anomaliesData={anomaliesData}
          isDraggable={isDraggable}
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
          hostName={hostName}
        />
      )}
    </AnomalyTableProvider>
  );
};
