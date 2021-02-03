/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiStat, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { TimelineKpiStrategyResponse } from '../../../../../common/search_strategy';
import { getEmptyValue } from '../../../../common/components/empty_value';
import * as i18n from './translations';

export const TimelineKPIs = React.memo(
  ({ kpis, isLoading }: { kpis: TimelineKpiStrategyResponse | null; isLoading: boolean }) => {
    return (
      <EuiFlexGroup wrap data-test-subj="siem-timeline-kpis">
        <EuiFlexItem>
          <EuiStat
            data-test-subj="siem-timeline-process-kpi"
            title={kpis === null ? getEmptyValue() : kpis.processCount}
            description={i18n.PROCESS_KPI_TITLE}
            titleSize="s"
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            data-test-subj="siem-timeline-user-kpi"
            title={kpis === null ? getEmptyValue() : kpis.userCount}
            description={i18n.USER_KPI_TITLE}
            titleSize="s"
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            data-test-subj="siem-timeline-host-kpi"
            title={kpis === null ? getEmptyValue() : kpis.hostCount}
            description={i18n.HOST_KPI_TITLE}
            titleSize="s"
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            data-test-subj="siem-timeline-source-ip-kpi"
            title={kpis === null ? getEmptyValue() : kpis.sourceIpCount}
            description={i18n.SOURCE_IP_KPI_TITLE}
            titleSize="s"
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 100 }}>
          <EuiStat
            data-test-subj="siem-timeline-destination-ip-kpi"
            title={kpis === null ? getEmptyValue() : kpis.destinationIpCount}
            description={i18n.DESTINATION_IP_KPI_TITLE}
            titleSize="s"
            isLoading={isLoading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

TimelineKPIs.displayName = 'TimelineKPIs';
