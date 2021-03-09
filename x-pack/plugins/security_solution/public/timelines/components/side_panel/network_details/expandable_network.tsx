/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { FlowTarget } from '../../../../../common/search_strategy';
import { NetworkDetailsLink } from '../../../../common/components/links';
import { IpOverview } from '../../../../network/components/details';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { networkToCriteria } from '../../../../common/components/ml/criteria/network_to_criteria';
import { scoreIntervalToDateTime } from '../../../../common/components/ml/score/score_interval_to_datetime';
import { useKibana } from '../../../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../../../common/lib/keury';
import { inputsSelectors } from '../../../../common/store';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { OverviewEmpty } from '../../../../overview/components/overview_empty';
import { esQuery } from '../../../../../../../../src/plugins/data/public';
import { useSourcererScope } from '../../../../common/containers/sourcerer';
import { useNetworkDetails } from '../../../../network/containers/details';
import { networkModel } from '../../../../network/store';
import { useAnomaliesTableData } from '../../../../common/components/ml/anomaly/use_anomalies_table_data';

interface ExpandableNetworkProps {
  expandedNetwork: { ip: string; flowTarget: FlowTarget };
}

const StyledTitle = styled.h4`
  word-break: break-all;
  word-wrap: break-word;
  white-space: pre-wrap;
`;

export const ExpandableNetworkDetailsTitle = ({ ip }: { ip: string }) => (
  <EuiTitle size="s">
    <StyledTitle>
      {i18n.translate('xpack.securitySolution.timeline.sidePanel.networkDetails.title', {
        defaultMessage: 'Network details',
      })}
      {`: ${ip}`}
    </StyledTitle>
  </EuiTitle>
);

export const ExpandableNetworkDetailsPageLink = ({
  expandedNetwork: { ip, flowTarget },
}: ExpandableNetworkProps) => (
  <NetworkDetailsLink ip={ip} flowTarget={flowTarget} isButton>
    {i18n.translate(
      'xpack.securitySolution.timeline.sidePanel.networkDetails.networkDetailsPageLink',
      {
        defaultMessage: 'View details page',
      }
    )}
  </NetworkDetailsLink>
);

export const ExpandableNetworkDetails = ({
  contextID,
  expandedNetwork,
}: ExpandableNetworkProps & { contextID: string }) => {
  const { ip, flowTarget } = expandedNetwork;
  const dispatch = useDispatch();
  const { to, from, isInitializing } = useGlobalTime();
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );

  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const type = networkModel.NetworkType.details;
  const narrowDateRange = useCallback(
    (score, interval) => {
      const fromTo = scoreIntervalToDateTime(score, interval);
      dispatch(
        setAbsoluteRangeDatePicker({
          id: 'global',
          from: fromTo.from,
          to: fromTo.to,
        })
      );
    },
    [dispatch]
  );
  const {
    services: { uiSettings },
  } = useKibana();

  const { docValueFields, indicesExist, indexPattern, selectedPatterns } = useSourcererScope();
  const filterQuery = convertToBuildEsQuery({
    config: esQuery.getEsQueryConfig(uiSettings),
    indexPattern,
    queries: [query],
    filters,
  });

  const [loading, { id, networkDetails }] = useNetworkDetails({
    docValueFields,
    skip: isInitializing,
    filterQuery,
    indexNames: selectedPatterns,
    ip,
  });

  const [isLoadingAnomaliesData, anomaliesData] = useAnomaliesTableData({
    criteriaFields: networkToCriteria(ip, flowTarget),
    startDate: from,
    endDate: to,
    skip: isInitializing,
  });

  return indicesExist ? (
    <IpOverview
      contextID={contextID}
      id={id}
      ip={ip}
      data={networkDetails}
      anomaliesData={anomaliesData}
      loading={loading}
      isInDetailsSidePanel
      isLoadingAnomaliesData={isLoadingAnomaliesData}
      type={type}
      flowTarget={flowTarget}
      startDate={from}
      endDate={to}
      narrowDateRange={narrowDateRange}
    />
  ) : (
    <OverviewEmpty />
  );
};
