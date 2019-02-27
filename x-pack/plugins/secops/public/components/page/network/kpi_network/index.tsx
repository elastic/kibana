/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import React from 'react';
import { pure } from 'recompose';
import { KpiNetworkData } from '../../../../graphql/types';
import * as i18n from './translations';

import {
  // @ts-ignore
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { has } from 'lodash/fp';
import { getEmptyTagValue } from '../../../empty_value';

interface KpiNetworkProps {
  data: KpiNetworkData;
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
];
export const KpiNetworkComponent = pure<KpiNetworkProps>(({ data }) => (
  <EuiFlexGroup>
    {kpiNetworkCards(data).map(item => (
      <EuiFlexItem key={item.description}>
        <EuiCard title={item.title} description={item.description} />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
));
