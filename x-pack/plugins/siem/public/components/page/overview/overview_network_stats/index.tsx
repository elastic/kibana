/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiStat,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { has } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';

import { OverviewNetworkData } from '../../../../graphql/types';
import { getEmptyTagValue } from '../../../empty_value';

import * as i18n from '../translations';

interface OverviewNetworkProps {
  data: OverviewNetworkData;
}

const overviewNetworkStats = (data: OverviewNetworkData) => [
  {
    title:
      has('packetbeatFlow', data) && data.packetbeatFlow !== null
        ? numeral(data.packetbeatFlow).format('0,0')
        : getEmptyTagValue(),
    description: i18n.PACKETBEAT_FLOW,
  },
  {
    title:
      has('packetbeatDNS', data) && data.packetbeatDNS !== null
        ? numeral(data.packetbeatDNS).format('0,0')
        : getEmptyTagValue(),
    description: i18n.PACKETBEAT_DNS,
  },
  {
    title:
      has('filebeatSuricata', data) && data.filebeatSuricata !== null
        ? numeral(data.filebeatSuricata).format('0,0')
        : getEmptyTagValue(),
    description: i18n.FILEBEAT_SURICATA,
  },
  {
    title:
      has('filebeatZeek', data) && data.filebeatZeek !== null
        ? numeral(data.filebeatZeek).format('0,0')
        : getEmptyTagValue(),
    description: i18n.FILEBEAT_ZEEK,
  },
  {
    title:
      has('auditbeatSocket', data) && data.auditbeatSocket !== null
        ? numeral(data.auditbeatSocket).format('0,0')
        : getEmptyTagValue(),
    description: i18n.AUDITBEAT_SOCKET,
  },
];
export const OverviewNetworkStats = pure<OverviewNetworkProps>(({ data }) => (
  <>
    {overviewNetworkStats(data).map(item => (
      <EuiStat
        key={item.description}
        textAlign="center"
        title={item.title}
        description={item.description}
      />
    ))}
  </>
));
