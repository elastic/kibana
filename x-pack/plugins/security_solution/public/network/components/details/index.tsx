/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars as lightTheme, euiDarkVars as darkTheme } from '@kbn/ui-theme';
import React from 'react';

import { DEFAULT_DARK_MODE } from '../../../../common/constants';
import { DescriptionList } from '../../../../common/utility_types';
import { useUiSetting$ } from '../../../common/lib/kibana';
import { FlowTarget, NetworkDetailsStrategyResponse } from '../../../../common/search_strategy';
import { networkModel } from '../../store';
import { getEmptyTagValue } from '../../../common/components/empty_value';

import {
  autonomousSystemRenderer,
  dateRenderer,
  hostIdRenderer,
  hostNameRenderer,
  locationRenderer,
  reputationRenderer,
  whoisRenderer,
} from '../../../timelines/components/field_renderers/field_renderers';
import * as i18n from './translations';
import { OverviewWrapper } from '../../../common/components/page';
import { Loader } from '../../../common/components/loader';
import { Anomalies, NarrowDateRange } from '../../../common/components/ml/types';
import { AnomalyScores } from '../../../common/components/ml/score/anomaly_scores';
import { useMlCapabilities } from '../../../common/components/ml/hooks/use_ml_capabilities';
import { hasMlUserPermissions } from '../../../../common/machine_learning/has_ml_user_permissions';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';
import { OverviewDescriptionList } from '../../../common/components/overview_description_list';

export interface IpOverviewProps {
  anomaliesData: Anomalies | null;
  contextID?: string; // used to provide unique draggable context when viewing in the side panel
  data: NetworkDetailsStrategyResponse['networkDetails'];
  endDate: string;
  flowTarget: FlowTarget;
  id: string;
  ip: string;
  isDraggable?: boolean;
  isInDetailsSidePanel: boolean;
  isLoadingAnomaliesData: boolean;
  loading: boolean;
  narrowDateRange: NarrowDateRange;
  startDate: string;
  type: networkModel.NetworkType;
}

export const IpOverview = React.memo<IpOverviewProps>(
  ({
    contextID,
    id,
    ip,
    data,
    isDraggable = false,
    isInDetailsSidePanel = false, // Rather than duplicate the component, alter the structure based on it's location
    loading,
    flowTarget,
    startDate,
    endDate,
    isLoadingAnomaliesData,
    anomaliesData,
    narrowDateRange,
  }) => {
    const capabilities = useMlCapabilities();
    const userPermissions = hasMlUserPermissions(capabilities);
    const [darkMode] = useUiSetting$<boolean>(DEFAULT_DARK_MODE);
    const typeData = data[flowTarget];
    const column: DescriptionList[] = [
      {
        title: i18n.LOCATION,
        description: locationRenderer(
          [`${flowTarget}.geo.city_name`, `${flowTarget}.geo.region_name`],
          data,
          contextID,
          isDraggable
        ),
      },
      {
        title: i18n.AUTONOMOUS_SYSTEM,
        description: typeData
          ? autonomousSystemRenderer(typeData.autonomousSystem, flowTarget, contextID, isDraggable)
          : getEmptyTagValue(),
      },
    ];

    const firstColumn: DescriptionList[] = userPermissions
      ? [
          ...column,
          {
            title: i18n.MAX_ANOMALY_SCORE_BY_JOB,
            description: (
              <AnomalyScores
                anomalies={anomaliesData}
                startDate={startDate}
                endDate={endDate}
                isLoading={isLoadingAnomaliesData}
                narrowDateRange={narrowDateRange}
              />
            ),
          },
        ]
      : column;

    const descriptionLists: Readonly<DescriptionList[][]> = [
      firstColumn,
      [
        {
          title: i18n.FIRST_SEEN,
          description: typeData ? dateRenderer(typeData.firstSeen) : getEmptyTagValue(),
        },
        {
          title: i18n.LAST_SEEN,
          description: typeData ? dateRenderer(typeData.lastSeen) : getEmptyTagValue(),
        },
      ],
      [
        {
          title: i18n.HOST_ID,
          description:
            typeData && data.host
              ? hostIdRenderer({ host: data.host, isDraggable, ipFilter: ip, contextID })
              : getEmptyTagValue(),
        },
        {
          title: i18n.HOST_NAME,
          description:
            typeData && data.host
              ? hostNameRenderer(data.host, ip, contextID, isDraggable)
              : getEmptyTagValue(),
        },
      ],
      [
        { title: i18n.WHOIS, description: whoisRenderer(ip) },
        { title: i18n.REPUTATION, description: reputationRenderer(ip) },
      ],
    ];

    return (
      <InspectButtonContainer>
        <OverviewWrapper direction={isInDetailsSidePanel ? 'column' : 'row'}>
          {!isInDetailsSidePanel && (
            <InspectButton queryId={id} title={i18n.INSPECT_TITLE} inspectIndex={0} />
          )}
          {descriptionLists.map((descriptionList, index) => (
            <OverviewDescriptionList descriptionList={descriptionList} key={index} />
          ))}

          {loading && (
            <Loader
              overlay
              overlayBackground={
                darkMode ? darkTheme.euiPageBackgroundColor : lightTheme.euiPageBackgroundColor
              }
              size="xl"
            />
          )}
        </OverviewWrapper>
      </InspectButtonContainer>
    );
  }
);

IpOverview.displayName = 'IpOverview';
