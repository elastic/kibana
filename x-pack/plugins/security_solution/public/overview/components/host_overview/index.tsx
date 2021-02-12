/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule } from '@elastic/eui';
import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { getOr } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';

import { DocValueFields, HostItem } from '../../../../common/search_strategy';
import { DEFAULT_DARK_MODE } from '../../../../common/constants';
import { DescriptionList } from '../../../../common/utility_types';
import { useUiSetting$ } from '../../../common/lib/kibana';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import {
  DefaultFieldRenderer,
  hostIdRenderer,
} from '../../../timelines/components/field_renderers/field_renderers';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';
import { Loader } from '../../../common/components/loader';
import { NetworkDetailsLink } from '../../../common/components/links';
import { hasMlUserPermissions } from '../../../../common/machine_learning/has_ml_user_permissions';
import { useMlCapabilities } from '../../../common/components/ml/hooks/use_ml_capabilities';
import { AnomalyScores } from '../../../common/components/ml/score/anomaly_scores';
import { Anomalies, NarrowDateRange } from '../../../common/components/ml/types';
import { OverviewWrapper } from '../../../common/components/page';
import {
  FirstLastSeenHost,
  FirstLastSeenHostType,
} from '../../../hosts/components/first_last_seen_host';

import * as i18n from './translations';
import { EndpointOverview } from './endpoint_overview';
import { OverviewDescriptionList } from '../../../common/components/overview_description_list';

interface HostSummaryProps {
  contextID?: string; // used to provide unique draggable context when viewing in the side panel
  data: HostItem;
  docValueFields: DocValueFields[];
  id: string;
  isInDetailsSidePanel: boolean;
  loading: boolean;
  isLoadingAnomaliesData: boolean;
  indexNames: string[];
  anomaliesData: Anomalies | null;
  startDate: string;
  endDate: string;
  narrowDateRange: NarrowDateRange;
}

export const HostOverview = React.memo<HostSummaryProps>(
  ({
    anomaliesData,
    contextID,
    data,
    docValueFields,
    endDate,
    id,
    isInDetailsSidePanel = false, // Rather than duplicate the component, alter the structure based on it's location
    isLoadingAnomaliesData,
    indexNames,
    loading,
    narrowDateRange,
    startDate,
  }) => {
    const capabilities = useMlCapabilities();
    const userPermissions = hasMlUserPermissions(capabilities);
    const [darkMode] = useUiSetting$<boolean>(DEFAULT_DARK_MODE);

    const getDefaultRenderer = useCallback(
      (fieldName: string, fieldData: HostItem) => (
        <DefaultFieldRenderer
          rowItems={getOr([], fieldName, fieldData)}
          attrName={fieldName}
          idPrefix={contextID ? `host-overview-${contextID}` : 'host-overview'}
        />
      ),
      [contextID]
    );

    const column: DescriptionList[] = useMemo(
      () => [
        {
          title: i18n.HOST_ID,
          description: data.host
            ? hostIdRenderer({ host: data.host, noLink: true })
            : getEmptyTagValue(),
        },
        {
          title: i18n.FIRST_SEEN,
          description:
            data.host != null && data.host.name && data.host.name.length ? (
              <FirstLastSeenHost
                docValueFields={docValueFields}
                hostName={data.host.name[0]}
                indexNames={indexNames}
                type={FirstLastSeenHostType.FIRST_SEEN}
              />
            ) : (
              getEmptyTagValue()
            ),
        },
        {
          title: i18n.LAST_SEEN,
          description:
            data.host != null && data.host.name && data.host.name.length ? (
              <FirstLastSeenHost
                docValueFields={docValueFields}
                hostName={data.host.name[0]}
                indexNames={indexNames}
                type={FirstLastSeenHostType.LAST_SEEN}
              />
            ) : (
              getEmptyTagValue()
            ),
        },
      ],
      [data, docValueFields, indexNames]
    );
    const firstColumn = useMemo(
      () =>
        userPermissions
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
          : column,
      [
        anomaliesData,
        column,
        endDate,
        isLoadingAnomaliesData,
        narrowDateRange,
        startDate,
        userPermissions,
      ]
    );

    const descriptionLists: Readonly<DescriptionList[][]> = useMemo(
      () => [
        firstColumn,
        [
          {
            title: i18n.IP_ADDRESSES,
            description: (
              <DefaultFieldRenderer
                rowItems={getOr([], 'host.ip', data)}
                attrName={'host.ip'}
                idPrefix={contextID ? `host-overview-${contextID}` : 'host-overview'}
                render={(ip) => (ip != null ? <NetworkDetailsLink ip={ip} /> : getEmptyTagValue())}
              />
            ),
          },
          {
            title: i18n.MAC_ADDRESSES,
            description: getDefaultRenderer('host.mac', data),
          },
          { title: i18n.PLATFORM, description: getDefaultRenderer('host.os.platform', data) },
        ],
        [
          { title: i18n.OS, description: getDefaultRenderer('host.os.name', data) },
          { title: i18n.FAMILY, description: getDefaultRenderer('host.os.family', data) },
          { title: i18n.VERSION, description: getDefaultRenderer('host.os.version', data) },
          { title: i18n.ARCHITECTURE, description: getDefaultRenderer('host.architecture', data) },
        ],
        [
          {
            title: i18n.CLOUD_PROVIDER,
            description: getDefaultRenderer('cloud.provider', data),
          },
          {
            title: i18n.REGION,
            description: getDefaultRenderer('cloud.region', data),
          },
          {
            title: i18n.INSTANCE_ID,
            description: getDefaultRenderer('cloud.instance.id', data),
          },
          {
            title: i18n.MACHINE_TYPE,
            description: getDefaultRenderer('cloud.machine.type', data),
          },
        ],
      ],
      [contextID, data, firstColumn, getDefaultRenderer]
    );
    return (
      <>
        <InspectButtonContainer>
          <OverviewWrapper direction={isInDetailsSidePanel ? 'column' : 'row'}>
            {!isInDetailsSidePanel && (
              <InspectButton queryId={id} title={i18n.INSPECT_TITLE} inspectIndex={0} />
            )}
            {descriptionLists.map((descriptionList, index) => (
              <OverviewDescriptionList
                descriptionList={descriptionList}
                isInDetailsSidePanel={isInDetailsSidePanel}
                key={index}
              />
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
        {data.endpoint != null ? (
          <>
            <EuiHorizontalRule />
            <OverviewWrapper direction={isInDetailsSidePanel ? 'column' : 'row'}>
              <EndpointOverview
                contextID={contextID}
                data={data.endpoint}
                isInDetailsSidePanel={isInDetailsSidePanel}
              />

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
          </>
        ) : null}
      </>
    );
  }
);

HostOverview.displayName = 'HostOverview';
