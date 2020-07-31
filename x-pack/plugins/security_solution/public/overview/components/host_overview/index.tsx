/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { getOr } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';

import { DEFAULT_DARK_MODE } from '../../../../common/constants';
import { DescriptionList } from '../../../../common/utility_types';
import { useUiSetting$ } from '../../../common/lib/kibana';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import {
  DefaultFieldRenderer,
  hostIdRenderer,
} from '../../../timelines/components/field_renderers/field_renderers';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';
import { HostItem } from '../../../graphql/types';
import { Loader } from '../../../common/components/loader';
import { IPDetailsLink } from '../../../common/components/links';
import { hasMlUserPermissions } from '../../../../common/machine_learning/has_ml_user_permissions';
import { useMlCapabilities } from '../../../common/components/ml_popover/hooks/use_ml_capabilities';
import { AnomalyScores } from '../../../common/components/ml/score/anomaly_scores';
import { Anomalies, NarrowDateRange } from '../../../common/components/ml/types';
import { DescriptionListStyled, OverviewWrapper } from '../../../common/components/page';
import {
  FirstLastSeenHost,
  FirstLastSeenHostType,
} from '../../../hosts/components/first_last_seen_host';

import * as i18n from './translations';
import { EndpointOverview } from './endpoint_overview';

interface HostSummaryProps {
  data: HostItem;
  id: string;
  loading: boolean;
  isLoadingAnomaliesData: boolean;
  anomaliesData: Anomalies | null;
  startDate: string;
  endDate: string;
  narrowDateRange: NarrowDateRange;
}

const getDescriptionList = (descriptionList: DescriptionList[], key: number) => (
  <EuiFlexItem key={key}>
    <DescriptionListStyled listItems={descriptionList} />
  </EuiFlexItem>
);

export const HostOverview = React.memo<HostSummaryProps>(
  ({
    anomaliesData,
    data,
    endDate,
    id,
    isLoadingAnomaliesData,
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
          idPrefix="host-overview"
        />
      ),
      []
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
                hostname={data.host.name[0]}
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
                hostname={data.host.name[0]}
                type={FirstLastSeenHostType.LAST_SEEN}
              />
            ) : (
              getEmptyTagValue()
            ),
        },
      ],
      [data]
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
                idPrefix="host-overview"
                render={(ip) => (ip != null ? <IPDetailsLink ip={ip} /> : getEmptyTagValue())}
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
      [data, firstColumn, getDefaultRenderer]
    );
    return (
      <>
        <InspectButtonContainer>
          <OverviewWrapper>
            <InspectButton queryId={id} title={i18n.INSPECT_TITLE} inspectIndex={0} />

            {descriptionLists.map((descriptionList, index) =>
              getDescriptionList(descriptionList, index)
            )}

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
            <OverviewWrapper>
              <EndpointOverview data={data.endpoint} />

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
