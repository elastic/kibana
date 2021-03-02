/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiStat, EuiFlexItem, EuiFlexGroup, EuiToolTip } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { DEFAULT_NUMBER_FORMAT } from '../../../../../common/constants';
import { useUiSetting$ } from '../../../../common/lib/kibana';
import { TimelineKpiStrategyResponse } from '../../../../../common/search_strategy';
import { getEmptyValue } from '../../../../common/components/empty_value';
import * as i18n from './translations';

export const TimelineKPIs = React.memo(
  ({ kpis, isLoading }: { kpis: TimelineKpiStrategyResponse | null; isLoading: boolean }) => {
    const kpiFormat = '0,0.[000]a';
    const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
    const formattedKpis = useMemo(() => {
      return {
        process: kpis === null ? getEmptyValue() : numeral(kpis.processCount).format(kpiFormat),
        user: kpis === null ? getEmptyValue() : numeral(kpis.userCount).format(kpiFormat),
        host: kpis === null ? getEmptyValue() : numeral(kpis.hostCount).format(kpiFormat),
        sourceIp: kpis === null ? getEmptyValue() : numeral(kpis.sourceIpCount).format(kpiFormat),
        destinationIp:
          kpis === null ? getEmptyValue() : numeral(kpis.destinationIpCount).format(kpiFormat),
      };
    }, [kpis]);
    const formattedKpiToolTips = useMemo(() => {
      return {
        process: numeral(kpis?.processCount).format(defaultNumberFormat),
        user: numeral(kpis?.userCount).format(defaultNumberFormat),
        host: numeral(kpis?.hostCount).format(defaultNumberFormat),
        sourceIp: numeral(kpis?.sourceIpCount).format(defaultNumberFormat),
        destinationIp: numeral(kpis?.destinationIpCount).format(defaultNumberFormat),
      };
    }, [kpis, defaultNumberFormat]);
    return (
      <EuiFlexGroup wrap data-test-subj="siem-timeline-kpis">
        <EuiFlexItem>
          <EuiToolTip position="left" content={formattedKpiToolTips.process}>
            <EuiStat
              data-test-subj="siem-timeline-process-kpi"
              title={formattedKpis.process}
              description={i18n.PROCESS_KPI_TITLE}
              titleSize="s"
              isLoading={isLoading}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiToolTip position="left" content={formattedKpiToolTips.user}>
            <EuiStat
              data-test-subj="siem-timeline-user-kpi"
              title={formattedKpis.user}
              description={i18n.USER_KPI_TITLE}
              titleSize="s"
              isLoading={isLoading}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiToolTip position="left" content={formattedKpiToolTips.host}>
            <EuiStat
              data-test-subj="siem-timeline-host-kpi"
              title={formattedKpis.host}
              description={i18n.HOST_KPI_TITLE}
              titleSize="s"
              isLoading={isLoading}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiToolTip position="left" content={formattedKpiToolTips.sourceIp}>
            <EuiStat
              data-test-subj="siem-timeline-source-ip-kpi"
              title={formattedKpis.sourceIp}
              description={i18n.SOURCE_IP_KPI_TITLE}
              titleSize="s"
              isLoading={isLoading}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 100 }}>
          <EuiToolTip position="left" content={formattedKpiToolTips.destinationIp}>
            <EuiStat
              data-test-subj="siem-timeline-destination-ip-kpi"
              title={formattedKpis.destinationIp}
              description={i18n.DESTINATION_IP_KPI_TITLE}
              titleSize="s"
              isLoading={isLoading}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

TimelineKPIs.displayName = 'TimelineKPIs';
