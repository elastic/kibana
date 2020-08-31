/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import styled from 'styled-components';

import { OverviewNetworkData } from '../../../graphql/types';
import { FormattedStat, StatGroup } from '../types';
import { StatValue } from '../stat_value';

interface OverviewNetworkProps {
  data: OverviewNetworkData;
  loading: boolean;
}

export const getOverviewNetworkStats = (data: OverviewNetworkData): FormattedStat[] => [
  {
    count: data.auditbeatSocket ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.auditBeatSocketTitle"
        defaultMessage="Socket"
      />
    ),
    id: 'auditbeatSocket',
  },
  {
    count: data.filebeatCisco ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.filebeatCiscoTitle"
        defaultMessage="Cisco"
      />
    ),
    id: 'filebeatCisco',
  },
  {
    count: data.filebeatNetflow ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.filebeatNetflowTitle"
        defaultMessage="Netflow"
      />
    ),
    id: 'filebeatNetflow',
  },
  {
    count: data.filebeatPanw ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.filebeatPanwTitle"
        defaultMessage="Palo Alto Networks"
      />
    ),
    id: 'filebeatPanw',
  },
  {
    count: data.filebeatSuricata ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.fileBeatSuricataTitle"
        defaultMessage="Suricata"
      />
    ),
    id: 'filebeatSuricata',
  },
  {
    count: data.filebeatZeek ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.fileBeatZeekTitle"
        defaultMessage="Zeek"
      />
    ),
    id: 'filebeatZeek',
  },
  {
    count: data.packetbeatDNS ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.packetBeatDnsTitle"
        defaultMessage="DNS"
      />
    ),
    id: 'packetbeatDNS',
  },
  {
    count: data.packetbeatFlow ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.packetBeatFlowTitle"
        defaultMessage="Flow"
      />
    ),
    id: 'packetbeatFlow',
  },
  {
    count: data.packetbeatTLS ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.packetbeatTLSTitle"
        defaultMessage="TLS"
      />
    ),
    id: 'packetbeatTLS',
  },
];

const networkStatGroups: StatGroup[] = [
  {
    groupId: 'auditbeat',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.overview.networkStatGroupAuditbeat"
        defaultMessage="Auditbeat"
      />
    ),
    statIds: ['auditbeatSocket'],
  },
  {
    groupId: 'filebeat',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.overview.networkStatGroupFilebeat"
        defaultMessage="Filebeat"
      />
    ),
    statIds: [
      'filebeatCisco',
      'filebeatNetflow',
      'filebeatPanw',
      'filebeatSuricata',
      'filebeatZeek',
    ],
  },
  {
    groupId: 'packetbeat',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.overview.networkStatGroupPacketbeat"
        defaultMessage="Packetbeat"
      />
    ),
    statIds: ['packetbeatDNS', 'packetbeatFlow', 'packetbeatTLS'],
  },
];

const NetworkStatsContainer = styled.div`
  .accordion-button {
    width: 100%;
  }
`;

const Title = styled.div`
  margin-left: 24px;
`;

const AccordionContent = styled.div`
  margin-top: 8px;
`;

const OverviewNetworkStatsComponent: React.FC<OverviewNetworkProps> = ({ data, loading }) => {
  const allNetworkStats = getOverviewNetworkStats(data);
  const allNetworkStatsCount = allNetworkStats.reduce((total, stat) => total + stat.count, 0);

  return (
    <NetworkStatsContainer data-test-subj="overview-network-stats">
      {networkStatGroups.map((statGroup, i) => {
        const statsForGroup = allNetworkStats.filter((s) => statGroup.statIds.includes(s.id));
        const statsForGroupCount = statsForGroup.reduce((total, stat) => total + stat.count, 0);

        return (
          <React.Fragment key={statGroup.groupId}>
            <EuiHorizontalRule margin="xs" />
            <EuiAccordion
              id={`network-stat-accordion-group${statGroup.groupId}`}
              buttonContent={
                <EuiFlexGroup
                  data-test-subj={`network-stat-group-${statGroup.groupId}`}
                  justifyContent="spaceBetween"
                >
                  <EuiFlexItem grow={false}>
                    <EuiText>{statGroup.name}</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <StatValue
                      count={statsForGroupCount}
                      isGroupStat={true}
                      isLoading={loading}
                      max={allNetworkStatsCount}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              buttonContentClassName="accordion-button"
            >
              <AccordionContent>
                {statsForGroup.map((stat) => (
                  <EuiFlexGroup key={stat.id} justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <EuiText color="subdued" size="s">
                        <Title>{stat.title}</Title>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem data-test-subj={`network-stat-${stat.id}`} grow={false}>
                      <StatValue
                        count={stat.count}
                        isGroupStat={false}
                        isLoading={loading}
                        max={statsForGroupCount}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ))}
              </AccordionContent>
            </EuiAccordion>
          </React.Fragment>
        );
      })}
    </NetworkStatsContainer>
  );
};

export const OverviewNetworkStats = React.memo(OverviewNetworkStatsComponent);
