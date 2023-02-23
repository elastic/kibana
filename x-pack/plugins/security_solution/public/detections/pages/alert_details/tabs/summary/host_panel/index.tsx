/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import React, { useCallback, useMemo } from 'react';
import { find } from 'lodash/fp';
import type { EuiFlexItemProps } from '@elastic/eui';
import { TimelineId } from '../../../../../../../common/types';
import { isAlertFromEndpointEvent } from '../../../../../../common/utils/endpoint_alert_check';
import { SummaryValueCell } from '../../../../../../common/components/event_details/table/summary_value_cell';
import { useRiskScore } from '../../../../../../explore/containers/risk_score';
import { RiskScoreEntity } from '../../../../../../../common/search_strategy';
import { getEmptyTagValue } from '../../../../../../common/components/empty_value';
import { RiskScore } from '../../../../../../explore/components/risk_score/severity/common';
import {
  FirstLastSeen,
  FirstLastSeenType,
} from '../../../../../../common/components/first_last_seen';
import { DefaultFieldRenderer } from '../../../../../../timelines/components/field_renderers/field_renderers';
import { HostDetailsLink, NetworkDetailsLink } from '../../../../../../common/components/links';
import type { SelectedDataView } from '../../../../../../common/store/sourcerer/model';
import { getEnrichedFieldInfo } from '../../../../../../common/components/event_details/helpers';
import { getTimelineEventData } from '../../../utils/get_timeline_event_data';
import {
  AGENT_STATUS_TITLE,
  HOST_NAME_TITLE,
  HOST_PANEL_TITLE,
  HOST_RISK_CLASSIFICATION,
  HOST_RISK_SCORE,
  IP_ADDRESSES_TITLE,
  LAST_SEEN_TITLE,
  OPERATING_SYSTEM_TITLE,
} from '../translation';
import { SummaryPanel } from '../wrappers';
import { HostPanelActions, HOST_PANEL_ACTIONS_CLASS } from './host_panel_actions';

export interface HostPanelProps {
  data: TimelineEventsDetailsItem[];
  id: string;
  openHostDetailsPanel: (hostName: string, onClose?: (() => void) | undefined) => void;
  selectedPatterns: SelectedDataView['selectedPatterns'];
  browserFields: SelectedDataView['browserFields'];
}

const HostPanelSection: React.FC<{
  title?: string | React.ReactElement;
  grow?: EuiFlexItemProps['grow'];
}> = ({ grow, title, children }) =>
  children ? (
    <EuiFlexItem grow={grow}>
      {title && (
        <>
          <EuiTitle size="xxs">
            <h5>{title}</h5>
          </EuiTitle>
          <EuiSpacer size="xs" />
        </>
      )}
      {children}
    </EuiFlexItem>
  ) : null;

export const HostPanel = React.memo(
  ({ data, id, browserFields, openHostDetailsPanel, selectedPatterns }: HostPanelProps) => {
    const hostName = getTimelineEventData('host.name', data);
    const hostOs = getTimelineEventData('host.os.name', data);

    const enrichedAgentStatus = useMemo(() => {
      const item = find({ field: 'agent.id', category: 'agent' }, data);
      if (!data || !isAlertFromEndpointEvent({ data })) return null;
      return (
        item &&
        getEnrichedFieldInfo({
          eventId: id,
          contextId: TimelineId.detectionsAlertDetailsPage,
          scopeId: TimelineId.detectionsAlertDetailsPage,
          browserFields,
          item,
          field: { id: 'agent.id', overrideField: 'agent.status' },
          linkValueField: undefined,
        })
      );
    }, [browserFields, data, id]);

    const { data: hostRisk, isLicenseValid: isRiskLicenseValid } = useRiskScore({
      riskEntity: RiskScoreEntity.host,
      skip: hostName == null,
    });

    const [hostRiskScore, hostRiskLevel] = useMemo(() => {
      const hostRiskData = hostRisk && hostRisk.length > 0 ? hostRisk[0] : undefined;
      const hostRiskValue = hostRiskData
        ? Math.round(hostRiskData.host.risk.calculated_score_norm)
        : getEmptyTagValue();
      const hostRiskSeverity = hostRiskData ? (
        <RiskScore severity={hostRiskData.host.risk.calculated_level} hideBackgroundColor />
      ) : (
        getEmptyTagValue()
      );

      return [hostRiskValue, hostRiskSeverity];
    }, [hostRisk]);

    const hostIpFields = useMemo(
      () => find({ field: 'host.ip', category: 'host' }, data)?.values ?? [],
      [data]
    );

    const renderHostIp = useCallback(
      (ip: string) => (ip != null ? <NetworkDetailsLink ip={ip} /> : getEmptyTagValue()),
      []
    );

    const renderHostActions = useCallback(
      () => <HostPanelActions openHostDetailsPanel={openHostDetailsPanel} hostName={hostName} />,
      [hostName, openHostDetailsPanel]
    );

    return (
      <SummaryPanel
        actionsClassName={HOST_PANEL_ACTIONS_CLASS}
        grow
        renderActionsPopover={hostName ? renderHostActions : undefined}
        title={HOST_PANEL_TITLE}
      >
        <EuiFlexGroup data-test-subj="host-panel">
          <EuiFlexItem grow={2}>
            <EuiFlexGroup>
              <HostPanelSection grow={false}>
                <EuiIcon type="storage" size="xl" />
              </HostPanelSection>
              <HostPanelSection title={HOST_NAME_TITLE}>
                <HostDetailsLink hostName={hostName} />
              </HostPanelSection>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            <EuiFlexGroup data-test-subj="host-panel-agent-status">
              <HostPanelSection title={OPERATING_SYSTEM_TITLE}>{hostOs}</HostPanelSection>
              {enrichedAgentStatus && (
                <HostPanelSection title={AGENT_STATUS_TITLE}>
                  <SummaryValueCell {...enrichedAgentStatus} />
                </HostPanelSection>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            {isRiskLicenseValid && (
              <>
                <EuiFlexGroup data-test-subj="host-panel-risk">
                  {hostRiskScore && (
                    <HostPanelSection title={HOST_RISK_SCORE}>{hostRiskScore}</HostPanelSection>
                  )}
                  {hostRiskLevel && (
                    <HostPanelSection title={HOST_RISK_CLASSIFICATION}>
                      {hostRiskLevel}
                    </HostPanelSection>
                  )}
                </EuiFlexGroup>
                <EuiSpacer size="l" />
              </>
            )}
            <EuiFlexGroup data-test-subj="host-panel-ip">
              <HostPanelSection title={IP_ADDRESSES_TITLE} grow={2}>
                <DefaultFieldRenderer
                  rowItems={hostIpFields}
                  attrName={'host.ip'}
                  idPrefix="alert-details-page-user"
                  render={renderHostIp}
                />
              </HostPanelSection>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            <EuiFlexGroup>
              <HostPanelSection title={LAST_SEEN_TITLE} grow={2}>
                <FirstLastSeen
                  indexPatterns={selectedPatterns}
                  field={'host.name'}
                  value={hostName}
                  type={FirstLastSeenType.LAST_SEEN}
                />
              </HostPanelSection>
            </EuiFlexGroup>
            <EuiSpacer />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SummaryPanel>
    );
  }
);

HostPanel.displayName = 'HostPanel';
