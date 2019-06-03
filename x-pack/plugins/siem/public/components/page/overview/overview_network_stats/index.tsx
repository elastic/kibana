/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiLoadingSpinner,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { FormattedMessage } from '@kbn/i18n/react';
import { has } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OverviewNetworkData } from '../../../../graphql/types';
import { getEmptyTagValue } from '../../../empty_value';

interface OverviewNetworkProps {
  data: OverviewNetworkData;
  loading: boolean;
}

const overviewNetworkStats = (data: OverviewNetworkData) => [
  {
    description:
      has('auditbeatSocket', data) && data.auditbeatSocket !== null
        ? numeral(data.auditbeatSocket).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        id="xpack.siem.overview.auditBeatSocketTitle"
        defaultMessage="Auditbeat Socket"
      />
    ),
  },
  {
    description:
      has('filebeatCisco', data) && data.filebeatCisco !== null
        ? numeral(data.filebeatCisco).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        id="xpack.siem.overview.filebeatCiscoTitle"
        defaultMessage="Filebeat Cisco"
      />
    ),
  },
  {
    description:
      has('filebeatNetflow', data) && data.filebeatNetflow !== null
        ? numeral(data.filebeatNetflow).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        id="xpack.siem.overview.filebeatNetflowTitle"
        defaultMessage="Filebeat Netflow"
      />
    ),
  },
  {
    description:
      has('filebeatPanw', data) && data.filebeatPanw !== null
        ? numeral(data.filebeatPanw).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        id="xpack.siem.overview.filebeatPanwTitle"
        defaultMessage="Filebeat Palo Alto Network"
      />
    ),
  },
  {
    description:
      has('filebeatSuricata', data) && data.filebeatSuricata !== null
        ? numeral(data.filebeatSuricata).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        id="xpack.siem.overview.fileBeatSuricataTitle"
        defaultMessage="Filebeat Suricata"
      />
    ),
  },
  {
    description:
      has('filebeatZeek', data) && data.filebeatZeek !== null
        ? numeral(data.filebeatZeek).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage id="xpack.siem.overview.fileBeatZeekTitle" defaultMessage="Filebeat Zeek" />
    ),
  },
  {
    description:
      has('packetbeatDNS', data) && data.packetbeatDNS !== null
        ? numeral(data.packetbeatDNS).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        id="xpack.siem.overview.packetBeatDnsTitle"
        defaultMessage="Packetbeat DNS"
      />
    ),
  },
  {
    description:
      has('packetbeatFlow', data) && data.packetbeatFlow !== null
        ? numeral(data.packetbeatFlow).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        id="xpack.siem.overview.packetBeatFlowTitle"
        defaultMessage="Packetbeat Flow"
      />
    ),
  },
  {
    description:
      has('packetbeatTLS', data) && data.packetbeatTLS !== null
        ? numeral(data.packetbeatTLS).format('0,0')
        : getEmptyTagValue(),
    title: (
      <FormattedMessage
        id="xpack.siem.overview.packetbeatTLSTitle"
        defaultMessage="Packetbeat TLS"
      />
    ),
  },
];

export const DescriptionListDescription = styled(EuiDescriptionListDescription)`
  text-align: right;
`;

const StatValue = pure<{ isLoading: boolean; value: React.ReactNode | null | undefined }>(
  ({ isLoading, value }) => (
    <>{isLoading ? <EuiLoadingSpinner size="m" /> : value != null ? value : getEmptyTagValue()}</>
  )
);

export const OverviewNetworkStats = pure<OverviewNetworkProps>(({ data, loading }) => (
  <EuiDescriptionList type="column">
    {overviewNetworkStats(data).map((item, index) => (
      <React.Fragment key={index}>
        <EuiDescriptionListTitle>{item.title}</EuiDescriptionListTitle>
        <DescriptionListDescription data-test-subj="stat-loader-description">
          <StatValue isLoading={loading} value={item.description} />
        </DescriptionListDescription>
      </React.Fragment>
    ))}
  </EuiDescriptionList>
));
