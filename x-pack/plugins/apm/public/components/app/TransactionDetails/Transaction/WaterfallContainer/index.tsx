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
import { Transaction } from '../../../../../../typings/Transaction';

import { RRRRender } from 'react-redux-request';
import { WaterfallV1Request } from 'x-pack/plugins/apm/public/store/reactReduxRequest/waterfallV1';
import { WaterfallV2Request } from 'x-pack/plugins/apm/public/store/reactReduxRequest/waterfallV2';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { WaterfallResponse } from 'x-pack/plugins/apm/typings/waterfall';
import { getAgentMarks } from './get_agent_marks';
import { getServiceColors } from './getServiceColors';
import { ServiceLegends } from './ServiceLegends';
import { Waterfall } from './Waterfall';
import { getWaterfall } from './Waterfall/waterfall_helpers/waterfall_helpers';

interface Props {
  urlParams: IUrlParams;
  transaction: Transaction;
  location: any;
}

interface WaterfallRequestProps {
  urlParams: IUrlParams;
  transaction: Transaction;
  render: RRRRender<WaterfallResponse>;
}

function WaterfallRequest({
  urlParams,
  transaction,
  render
}: WaterfallRequestProps) {
  const hasTrace = transaction.hasOwnProperty('trace');
  if (hasTrace) {
    return (
      <WaterfallV2Request
        urlParams={urlParams}
        transaction={transaction}
        render={render}
      />
    );
  } else {
    return (
      <WaterfallV1Request
        urlParams={urlParams}
        transaction={transaction}
        render={render}
      />
    );
  }
}

export function WaterfallContainer({
  location,
  urlParams,
  transaction
}: Props) {
  return (
    <WaterfallRequest
      urlParams={urlParams}
      transaction={transaction}
      render={({ data }) => {
        const agentMarks = getAgentMarks(transaction);
        const waterfall = getWaterfall(data.hits, data.services, transaction);
        if (!waterfall) {
          return null;
        }
        const serviceColors = getServiceColors(waterfall.services);

        return (
          <div>
            <ServiceLegends serviceColors={serviceColors} />
            <Waterfall
              agentMarks={agentMarks}
              location={location}
              serviceColors={serviceColors}
              urlParams={urlParams}
              waterfall={waterfall}
            />
          </div>
        );
      }}
    />
  );
}
