
import React from 'react';
import { pure } from 'recompose';
import { KpiNetworkData } from '../../../../graphql/types';
import * as i18n from './translations';
import numeral from '@elastic/numeral';

import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiCard,
} from '@elastic/eui';
import { has } from 'lodash/fp';
import { getEmptyTagValue } from '../../../empty_value';

type KpiNetworkProps = {
  data: KpiNetworkData;
  loading: boolean;
}

const kpiNetworkCards = (data: KpiNetworkData) => [
  {
    title: has('activeAgents', data)
    ? numeral(data.activeAgents).format('0,0')
    : getEmptyTagValue(),
    description: i18n.ACTIVE_AGENTS
  },
  {
    title: has('networkEvents', data)
    ? numeral(data.networkEvents).format('0,0')
    : getEmptyTagValue(),
    description: i18n.NETWORK_EVENTS
  },
  {
    title: has('uniqueFlowId', data)
    ? numeral(data.uniqueFlowId).format('0,0')
    : getEmptyTagValue(),
    description: i18n.UNIQUE_ID
  }
];
export const KpiNetworkComponent = pure<KpiNetworkProps>(
  ({
    data,
    loading
  }) => (
    <EuiFlexGroup>
      {
        kpiNetworkCards(data).map((item) => (
          <EuiFlexItem key={item.description}>
            <EuiCard
              title={item.title}
              description={item.description}
            />
          </EuiFlexItem>
        ))
      }
    </EuiFlexGroup>
));
