/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { has } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';

import { KpiNetworkData } from '../../../../graphql/types';
import { getEmptyTagValue } from '../../../empty_value';
import { LoadingPanel } from '../../../loading';

import * as i18n from './translations';

interface KpiNetworkProps {
  data: KpiNetworkData;
  loading: boolean;
}

const kpiNetworkCards = (data: KpiNetworkData) => [
  {
    title:
      has('networkEvents', data) && data.networkEvents !== null
        ? numeral(data.networkEvents).format('0,0')
        : getEmptyTagValue(),
    description: i18n.NETWORK_EVENTS,
  },
  {
    title:
      has('uniqueFlowId', data) && data.uniqueFlowId !== null
        ? numeral(data.uniqueFlowId).format('0,0')
        : getEmptyTagValue(),
    description: i18n.UNIQUE_ID,
  },
  {
    title:
      has('activeAgents', data) && data.activeAgents !== null
        ? numeral(data.activeAgents).format('0,0')
        : getEmptyTagValue(),
    description: i18n.ACTIVE_AGENTS,
  },
  {
    title:
      has('uniquePrivateIps', data) && data.uniquePrivateIps !== null
        ? numeral(data.uniquePrivateIps).format('0,0')
        : getEmptyTagValue(),
    description: i18n.UNIQUE_PRIVATE_IP,
  },
];
export const KpiNetworkComponent = pure<KpiNetworkProps>(({ data, loading }) =>
  loading ? (
    <LoadingPanel
      height="auto"
      width="100%"
      text={i18n.LOADING}
      data-test-subj="InitialLoadingUniquePrivateIps"
    />
  ) : (
    <EuiFlexGroup>
      {kpiNetworkCards(data).map(item => (
        <EuiFlexItem key={item.description}>
          <EuiCard title={item.title} description={item.description} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  )
);
