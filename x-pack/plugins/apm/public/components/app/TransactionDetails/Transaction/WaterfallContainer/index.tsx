/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// @ts-ignore
import {
  SERVICE_NAME,
  TRACE_ID,
  TRANSACTION_ID
} from '../../../../../../common/constants';
import { Transaction } from '../../../../../../typings/es_schemas/Transaction';

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';

import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { getAgentMarks } from './get_agent_marks';
import { ServiceLegends } from './ServiceLegends';
import { Waterfall } from './Waterfall';
import { IWaterfall } from './Waterfall/waterfall_helpers/waterfall_helpers';

interface Props {
  urlParams: IUrlParams;
  transaction: Transaction;
  location: any;
  waterfall: IWaterfall;
}

export function WaterfallContainer({
  location,
  urlParams,
  transaction,
  waterfall
}: Props) {
  const agentMarks = getAgentMarks(transaction);
  if (!waterfall) {
    return null;
  }

  return (
    <div>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <ServiceLegends serviceColors={waterfall.serviceColors} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content="Distributed tracing is now supported as a beta feature of the APM UI timeline visualisation."
            position="left"
          >
            <EuiBadge color="hollow">Beta</EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <Waterfall
        agentMarks={agentMarks}
        location={location}
        serviceColors={waterfall.serviceColors}
        urlParams={urlParams}
        waterfall={waterfall}
      />
    </div>
  );
}
